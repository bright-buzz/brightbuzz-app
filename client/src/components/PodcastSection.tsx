import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, Play, Pause, Download, RefreshCw, Clock, Calendar, FileText } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Podcast } from "@shared/schema";

export function PodcastSection() {
  const [expandedPodcast, setExpandedPodcast] = useState<string | null>(null);
  const [playingPodcast, setPlayingPodcast] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const { data: podcasts = [], isLoading } = useQuery<Podcast[]>({
    queryKey: ['/api/podcasts'],
  });

  const generatePodcastMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/podcasts/generate'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/podcasts'] });
      toast({ 
        title: "Podcast Generated!", 
        description: "Your daily news podcast is ready to listen." 
      });
    },
    onError: () => {
      toast({ 
        title: "Generation Failed", 
        description: "Please try again later.",
        variant: "destructive"
      });
    },
  });

  const regeneratePodcastMutation = useMutation({
    mutationFn: (id: string) => apiRequest('POST', `/api/podcasts/${id}/regenerate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/podcasts'] });
      toast({ 
        title: "Podcast Regenerated!", 
        description: "Your podcast has been updated with fresh content." 
      });
    },
  });

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const toggleTranscript = (podcastId: string) => {
    setExpandedPodcast(expandedPodcast === podcastId ? null : podcastId);
  };

  const isValidAudioUrl = (url: string): boolean => {
    // Check if it's a fake URL or invalid
    return !!url && !url.includes('example.com') && (url.startsWith('data:audio/') || url.startsWith('http'));
  };

  const handlePlay = (podcast: Podcast) => {
    if (!podcast.audioUrl || !isValidAudioUrl(podcast.audioUrl)) {
      toast({
        title: "Audio Not Available",
        description: "Audio generation is currently limited due to API quotas. You can still read the transcript below.",
        variant: "destructive"
      });
      return;
    }

    if (playingPodcast === podcast.id && isPlaying) {
      // Pause current podcast
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      // Start new audio
      audioRef.current = new Audio(podcast.audioUrl);
      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current?.duration || 0);
      });
      
      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      });
      
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setPlayingPodcast(null);
        setCurrentTime(0);
      });
      
      audioRef.current.addEventListener('error', () => {
        toast({
          title: "Playback Error",
          description: "Audio generation is currently limited. Please try the transcript instead.",
          variant: "destructive"
        });
        setIsPlaying(false);
        setPlayingPodcast(null);
      });
      
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setPlayingPodcast(podcast.id);
        })
        .catch(() => {
          toast({
            title: "Playback Error",
            description: "Audio generation is currently limited. Please try the transcript instead.",
            variant: "destructive"
          });
        });
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>, podcast: Podcast) => {
    if (!audioRef.current || playingPodcast !== podcast.id) return;
    
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (isLoading) {
    return (
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
          <div className="flex items-center space-x-3">
            <Mic className="text-white text-lg" />
            <h2 className="text-xl font-bold text-white">Daily Podcast</h2>
            <Badge variant="secondary" className="bg-white/20 text-white">
              AI Generated
            </Badge>
          </div>
        </div>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
          </div>
        </div>
      </section>
    );
  }

  const latestPodcast = podcasts[0];
  const hasGeneratedToday = latestPodcast && 
    new Date(latestPodcast.createdAt).toDateString() === new Date().toDateString();

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Mic className="text-white text-lg" />
            <h2 className="text-xl font-bold text-white">Daily Podcast</h2>
            <Badge variant="secondary" className="bg-white/20 text-white">Just for You</Badge>
          </div>
          <div className="text-white text-sm">
            {hasGeneratedToday ? "Today's episode ready" : "Generate today's episode"}
          </div>
        </div>
      </div>
      <div className="p-6">
        {/* Generate/Regenerate Button */}
        <div className="mb-6">
          {!hasGeneratedToday ? (
            <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 p-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Ready for Today's News Digest?
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Generate a personalized 5-10 minute podcast with your curated news
                </p>
                <Button
                  onClick={() => generatePodcastMutation.mutate()}
                  disabled={generatePodcastMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                  data-testid="button-generate-podcast"
                >
                  {generatePodcastMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-4 w-4" />
                      Generate Today's Podcast
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ) : (
            <div className="flex justify-center">
              <Button
                onClick={() => regeneratePodcastMutation.mutate(latestPodcast.id)}
                disabled={regeneratePodcastMutation.isPending}
                variant="outline"
                size="sm"
                data-testid="button-regenerate-podcast"
              >
                {regeneratePodcastMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Regenerate with Latest News
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Podcast Episodes */}
        <div className="space-y-4">
          {podcasts.map((podcast) => (
            <Card key={podcast.id} className="border border-slate-200 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1" data-testid={`podcast-title-${podcast.id}`}>
                      {podcast.title}
                    </h3>
                    <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                      {podcast.description}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-slate-500">
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(podcast.createdAt).toLocaleDateString()}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDuration(podcast.duration)}</span>
                      </span>
                      <span>{(podcast.articleIds || []).length} articles</span>
                    </div>
                  </div>
                  {podcast.isProcessing && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      Processing...
                    </Badge>
                  )}
                </div>

                {/* Audio Player */}
                <div className="bg-slate-50 rounded-lg p-3 mb-3">
                  <div className="flex items-center space-x-3">
                    <Button
                      size="sm"
                      className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-700"
                      disabled={podcast.isProcessing || !isValidAudioUrl(podcast.audioUrl || "")}
                      onClick={() => handlePlay(podcast)}
                      data-testid={`button-play-${podcast.id}`}
                    >
                      {playingPodcast === podcast.id && isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <div className="flex-1">
                      <div 
                        className="bg-slate-300 rounded-full h-2 cursor-pointer"
                        onClick={(e) => handleProgressClick(e, podcast)}
                      >
                        <div 
                          className="bg-purple-600 h-2 rounded-full transition-all duration-100"
                          style={{ 
                            width: playingPodcast === podcast.id && duration > 0 
                              ? `${(currentTime / duration) * 100}%` 
                              : '0%' 
                          }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>
                          {playingPodcast === podcast.id 
                            ? formatDuration(currentTime) 
                            : '0:00'}
                        </span>
                        <span>
                          {playingPodcast === podcast.id && duration > 0
                            ? formatDuration(duration)
                            : formatDuration(podcast.duration)}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!podcast.audioUrl || !isValidAudioUrl(podcast.audioUrl || "") || (podcast.isProcessing || false)}
                      onClick={() => {
                        if (podcast.audioUrl && isValidAudioUrl(podcast.audioUrl)) {
                          window.open(podcast.audioUrl, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      data-testid={`button-download-${podcast.id}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  {(!podcast.audioUrl || !isValidAudioUrl(podcast.audioUrl || "")) && !podcast.isProcessing && (
                    <p className="text-xs text-slate-500 mt-2 text-center">
                      Audio not available due to API quota limits - Read transcript below
                    </p>
                  )}
                </div>

                {/* Transcript Toggle */}
                <div className="space-y-3">
                  <Button
                    onClick={() => toggleTranscript(podcast.id)}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    data-testid={`button-transcript-${podcast.id}`}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {expandedPodcast === podcast.id ? 'Hide' : 'Show'} Transcript
                  </Button>

                  {expandedPodcast === podcast.id && (
                    <Card className="bg-slate-50 p-4">
                      <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                        {podcast.transcript}
                      </pre>
                    </Card>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {podcasts.length === 0 && (
          <Card className="bg-slate-50 p-8 text-center">
            <Mic className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Podcasts Yet</h3>
            <p className="text-slate-600">Generate your first daily news podcast to get started!</p>
          </Card>
        )}
      </div>
    </section>
  );
}