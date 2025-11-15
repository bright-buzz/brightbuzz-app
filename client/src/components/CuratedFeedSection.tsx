import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Crown, Bookmark, BookmarkCheck } from "lucide-react";
import { useState, useEffect, useRef, type MouseEvent } from "react";
import type { Article } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { FeedbackButtons } from "@/components/FeedbackButtons";

export function CuratedFeedSection() {
  const ARTICLES_PER_PAGE = 20;
  const [visibleCount, setVisibleCount] = useState(ARTICLES_PER_PAGE);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  
  const { data: preferences } = useQuery({
    queryKey: ['/api/preferences'],
  });

  const { data: articles = [], isLoading } = useQuery<Article[]>({
    queryKey: ['/api/articles/filtered'],
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

  // Reset pagination when preferences change (filters updated)
  useEffect(() => {
    setVisibleCount(ARTICLES_PER_PAGE);
  }, [preferences]);

  const handleLoadMore = () => {
    setVisibleCount(prevCount => prevCount + ARTICLES_PER_PAGE);
  };

  if (isLoading) {
    return (
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-secondary to-emerald-600 px-6 py-4">
          <div className="flex items-center space-x-3">
            <Star className="text-white text-lg" />
            <h2 className="text-xl font-bold text-white">Curated Feed</h2>
            <Badge variant="secondary" className="bg-white/20 text-white">
              AI Selected
            </Badge>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const featuredArticle = articles[0];
  const otherArticles = articles.slice(1, visibleCount);
  const hasMoreArticles = articles.length > visibleCount;

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-secondary to-emerald-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Star className="text-white text-lg" />
            <h2 className="text-xl font-bold text-white">Curated Feed</h2>
            <Badge variant="secondary" className="bg-white/20 text-white">
              AI Selected
            </Badge>
          </div>
          <div className="text-white text-sm">Updated 5 min ago</div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Featured Article */}
          {featuredArticle && (
            <article 
              className="lg:col-span-2 group cursor-pointer"
              data-testid={`article-featured-${featuredArticle.id}`}
              onClick={() => window.open(featuredArticle.url, '_blank', 'noopener,noreferrer')}
            >
              <div className="relative mb-4">
                {featuredArticle.imageUrl && (
                  <img 
                    src={featuredArticle.imageUrl} 
                    alt={featuredArticle.title}
                    className="w-full h-48 lg:h-64 object-cover rounded-lg"
                    data-testid="img-featured-article" 
                  />
                )}
              </div>
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors mb-2">
                {featuredArticle.title}
              </h3>
              <p className="text-slate-600 text-sm mb-3 line-clamp-3">
                {featuredArticle.summary}
              </p>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center space-x-3">
                  <span>{featuredArticle.source}</span>
                  <span>{featuredArticle.readTime} min read</span>
                </div>
                <div className="flex items-center gap-2">
                  <FeedbackButtons articleId={featuredArticle.id} size="sm" />
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="flex items-center space-x-1 hover:text-primary transition-colors"
                    data-testid={`button-bookmark-${featuredArticle.id}`}
                    onClick={(e) => handleSave(e, featuredArticle.id)}
                  >
                    {savedArticleIds.has(featuredArticle.id) ? (
                      <>
                        <BookmarkCheck className="h-3 w-3 fill-primary text-primary" />
                        <span>Saved</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="h-3 w-3" />
                        <span>Save</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </article>
          )}

          {/* Other Articles */}
          {otherArticles.map((article) => (
            <article 
              key={article.id}
              className="group cursor-pointer p-4 border border-slate-100 rounded-lg hover:border-slate-200 hover:shadow-sm transition-all"
              data-testid={`article-curated-${article.id}`}
              onClick={() => window.open(article.url, '_blank', 'noopener,noreferrer')}
            >
              <div className="flex space-x-3">
                {article.imageUrl && (
                  <img 
                    src={article.imageUrl} 
                    alt={article.title}
                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    data-testid={`img-article-${article.id}`}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-900 group-hover:text-primary transition-colors mb-1 line-clamp-2">
                    {article.title}
                  </h4>
                  <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                    {article.summary}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{article.source}</span>
                    <div className="flex items-center gap-1">
                      <FeedbackButtons articleId={article.id} size="sm" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 hover:bg-slate-100"
                        onClick={(e) => handleSave(e, article.id)}
                        data-testid={`button-save-${article.id}`}
                      >
                        {savedArticleIds.has(article.id) ? (
                          <BookmarkCheck className="h-3 w-3 fill-primary text-primary" />
                        ) : (
                          <Bookmark className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
        
        {hasMoreArticles && (
          <div className="mt-6 text-center">
            <Button 
              onClick={handleLoadMore}
              className="bg-secondary hover:bg-emerald-700"
              data-testid="button-load-more-curated"
            >
              Load More Articles ({articles.length - visibleCount} remaining)
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
