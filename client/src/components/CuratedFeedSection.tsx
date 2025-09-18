import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Crown, Heart, Bookmark, Eye } from "lucide-react";
import { useState } from "react";
import type { Article } from "@shared/schema";

export function CuratedFeedSection() {
  const [visibleCount, setVisibleCount] = useState(5);
  const MAX_ARTICLES = 30;
  
  const { data: articles = [], isLoading } = useQuery<Article[]>({
    queryKey: ['/api/articles/curated'],
  });

  const handleLoadMore = () => {
    setVisibleCount(prev => Math.min(prev + 4, MAX_ARTICLES));
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
  const otherArticles = articles.slice(1, Math.min(visibleCount, MAX_ARTICLES));

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
              onClick={() => window.open(featuredArticle.url, '_blank')}
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
                <div className="absolute top-3 left-3 bg-secondary text-white text-xs px-2 py-1 rounded-full font-medium">
                  <Crown className="inline mr-1 h-3 w-3" />
                  Editor's Pick
                </div>
                <div className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                  {featuredArticle.category}
                </div>
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
                  <span className="flex items-center space-x-1">
                    <Heart className="h-3 w-3 text-red-500" />
                    <span>{Math.round(featuredArticle.sentiment * 100)}% positive</span>
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="flex items-center space-x-1 hover:text-primary transition-colors"
                  data-testid={`button-bookmark-${featuredArticle.id}`}
                >
                  <Bookmark className="h-3 w-3" />
                  <span>Save</span>
                </Button>
              </div>
            </article>
          )}

          {/* Other Articles */}
          {otherArticles.map((article) => (
            <article 
              key={article.id}
              className="group cursor-pointer p-4 border border-slate-100 rounded-lg hover:border-slate-200 hover:shadow-sm transition-all"
              data-testid={`article-curated-${article.id}`}
              onClick={() => window.open(article.url, '_blank')}
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
                    <span className="flex items-center space-x-1">
                      <Heart className="h-3 w-3 text-red-500" />
                      <span>{Math.round(article.sentiment * 100)}%</span>
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
        
        {articles.length > visibleCount && visibleCount < MAX_ARTICLES && (
          <div className="mt-6 text-center">
            <Button 
              onClick={handleLoadMore}
              className="bg-secondary hover:bg-emerald-700"
              data-testid="button-load-more-curated"
            >
              Load More Curated Articles
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
