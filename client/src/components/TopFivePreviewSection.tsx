import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListOrdered, Clock, Eye, Heart, Bookmark, BookmarkCheck } from "lucide-react";
import type { MouseEvent } from "react";
import type { Article } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export function TopFivePreviewSection() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  
  const { data: articles = [], isLoading } = useQuery<Article[]>({
    queryKey: ['/api/articles/top-five'],
  });

  const { data: savedArticlesData = [] } = useQuery<Article[]>({
    queryKey: ['/api/saved-articles'],
    enabled: isAuthenticated,
  });

  const savedArticleIds = new Set(savedArticlesData.map(a => a.id));

  const saveMutation = useMutation({
    mutationFn: (articleId: string) => 
      apiRequest('POST', `/api/articles/${articleId}/save`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-articles'] });
      toast({
        title: "Article saved",
        description: "Article added to your saved list.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save article. Please try again.",
        variant: "destructive",
      });
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: (articleId: string) => 
      apiRequest('POST', `/api/articles/${articleId}/unsave`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-articles'] });
      toast({
        title: "Article removed",
        description: "Article removed from your saved list.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove article. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = (e: MouseEvent, articleId: string) => {
    e.stopPropagation();
    if (savedArticleIds.has(articleId)) {
      unsaveMutation.mutate(articleId);
    } else {
      saveMutation.mutate(articleId);
    }
  };

  if (isLoading) {
    return (
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-blue-600 px-6 py-4">
          <div className="flex items-center space-x-3">
            <ListOrdered className="text-white text-lg" />
            <h2 className="text-xl font-bold text-white">Top 5 Articles</h2>
            <Badge variant="secondary" className="bg-white/20 text-white">
              Trending Now
            </Badge>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-start space-x-4">
                <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-primary to-blue-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ListOrdered className="text-white text-lg" />
            <h2 className="text-xl font-bold text-white">Top 5 Articles</h2>
            <Badge variant="secondary" className="bg-white/20 text-white">
              Trending Now
            </Badge>
          </div>
          <div className="flex items-center space-x-4 text-white text-sm">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>Last updated: 2 min ago</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          {articles.map((article, index) => (
            <article 
              key={article.id}
              className="flex items-start space-x-4 p-4 border border-slate-100 rounded-lg hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer group"
              data-testid={`article-top-${index + 1}`}
              onClick={() => window.open(article.url, '_blank', 'noopener,noreferrer')}
            >
              <div className={`${index === 0 ? 'bg-primary' : 'bg-slate-600'} text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0`}>
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 group-hover:text-primary transition-colors mb-2">
                      {article.title}
                    </h3>
                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                      {article.summary}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>{article.source}</span>
                      <span>{article.readTime} min read</span>
                      <span className="flex items-center space-x-1">
                        <Eye className="h-3 w-3" />
                        <span>{article.views} views</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Heart className="h-3 w-3 text-red-500" />
                        <span>{Math.round(article.sentiment * 100)}% positive</span>
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 hover:bg-slate-100"
                        onClick={(e) => handleSave(e, article.id)}
                        data-testid={`button-save-top-${index + 1}`}
                      >
                        {savedArticleIds.has(article.id) ? (
                          <BookmarkCheck className="h-3 w-3 fill-primary text-primary" />
                        ) : (
                          <Bookmark className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {article.imageUrl && (
                    <img 
                      src={article.imageUrl} 
                      alt={article.title}
                      className="w-20 h-16 sm:w-24 sm:h-18 object-cover rounded-lg flex-shrink-0 mt-2 sm:mt-0"
                      data-testid={`img-top-article-${index + 1}`}
                    />
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
