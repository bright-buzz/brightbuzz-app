import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { CuratedFeedSection } from "@/components/CuratedFeedSection";
import { TopFivePreviewSection } from "@/components/TopFivePreviewSection";
import { PodcastSection } from "@/components/PodcastSection";
import { FilterEffectivenessSection } from "@/components/FilterEffectivenessSection";
import { Button } from "@/components/ui/button";
import { Settings, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { FilterPreview } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  
  const { data: preferences } = useQuery({
    queryKey: ['/api/preferences'],
  });

  const { data: filterStats } = useQuery<FilterPreview>({
    queryKey: ['/api/filter-preview'],
    enabled: !!preferences,
  });

  // Manual refresh mutation
  const refreshMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/fetch-news', { force: true }),
    onSuccess: async () => {
      // Refetch queries to get fresh data while preserving old data until new data arrives
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['/api/articles'] }),
        queryClient.refetchQueries({ queryKey: ['/api/articles/curated'] }),
        queryClient.refetchQueries({ queryKey: ['/api/articles/top-five'] }),
        queryClient.refetchQueries({ queryKey: ['/api/filter-preview'] })
      ]);
      
      toast({
        title: "News Refreshed",
        description: "Latest news has been fetched and feed updated.",
      });
    },
    onError: () => {
      toast({
        title: "Refresh Failed",
        description: "Failed to fetch latest news. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Fetch initial news data
  useEffect(() => {
    const fetchNews = async () => {
      try {
        await apiRequest('POST', '/api/fetch-news');
      } catch (error) {
        console.error('Failed to fetch initial news:', error);
      }
    };

    fetchNews();
    
    // Set up periodic news fetching
    const interval = setInterval(fetchNews, 15 * 60 * 1000); // 15 minutes
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader filteredCount={filterStats?.stats?.filteredCount || 0} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <CuratedFeedSection />
        <TopFivePreviewSection />
        <PodcastSection />
        <FilterEffectivenessSection />
      </main>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        {/* Refresh Button */}
        <Button
          size="lg"
          variant="secondary"
          className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          data-testid="button-refresh-news"
        >
          <RefreshCw className={`h-5 w-5 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
        </Button>
        
        {/* Settings Button */}
        <Link href="/settings">
          <Button
            size="lg"
            className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
            data-testid="button-quick-settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
