import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface FeedbackButtonsProps {
  articleId: string;
  size?: "sm" | "md";
}

export function FeedbackButtons({ articleId, size = "md" }: FeedbackButtonsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAuthenticated = !!user;

  const { data: feedbackData } = useQuery<{ feedback: 'thumbs_up' | 'thumbs_down' | null }>({
    queryKey: ['/api/articles', articleId, 'feedback'],
    enabled: isAuthenticated,
  });

  const currentFeedback = feedbackData?.feedback || null;

  const feedbackMutation = useMutation({
    mutationFn: ({ feedback }: { feedback: 'thumbs_up' | 'thumbs_down' }) => 
      apiRequest('POST', `/api/articles/${articleId}/feedback`, { feedback }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/articles', articleId, 'feedback'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/feedback'] });
    },
    onError: () => {
      toast({
        title: "Failed to save feedback",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const removeFeedbackMutation = useMutation({
    mutationFn: () => 
      apiRequest('DELETE', `/api/articles/${articleId}/feedback`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/articles', articleId, 'feedback'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/feedback'] });
    },
    onError: () => {
      toast({
        title: "Failed to remove feedback",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleThumbsUp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) return;

    if (currentFeedback === 'thumbs_up') {
      removeFeedbackMutation.mutate();
    } else {
      feedbackMutation.mutate({ feedback: 'thumbs_up' });
    }
  };

  const handleThumbsDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) return;

    if (currentFeedback === 'thumbs_down') {
      removeFeedbackMutation.mutate();
    } else {
      feedbackMutation.mutate({ feedback: 'thumbs_down' });
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const buttonSize = size === "sm" ? "h-7 w-7" : "h-8 w-8";

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleThumbsUp}
        disabled={feedbackMutation.isPending || removeFeedbackMutation.isPending}
        data-testid={`button-thumbs-up-${articleId}`}
        className={`${buttonSize} ${currentFeedback === 'thumbs_up' ? 'text-green-600 bg-green-50' : 'hover:bg-green-50 hover:text-green-600'}`}
        title="I like this article"
      >
        <ThumbsUp 
          className={`${iconSize} ${currentFeedback === 'thumbs_up' ? 'fill-current' : ''}`} 
        />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={handleThumbsDown}
        disabled={feedbackMutation.isPending || removeFeedbackMutation.isPending}
        data-testid={`button-thumbs-down-${articleId}`}
        className={`${buttonSize} ${currentFeedback === 'thumbs_down' ? 'text-red-600 bg-red-50' : 'hover:bg-red-50 hover:text-red-600'}`}
        title="I don't like this article"
      >
        <ThumbsDown 
          className={`${iconSize} ${currentFeedback === 'thumbs_down' ? 'fill-current' : ''}`} 
        />
      </Button>
    </div>
  );
}
