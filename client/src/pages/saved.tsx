import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bookmark, ExternalLink, Clock, BookmarkX, ArrowLeft } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Article } from "@shared/schema";

export default function Saved() {
  const { toast } = useToast();
  
  const { data: savedArticles = [], isLoading } = useQuery<Article[]>({
    queryKey: ['/api/saved-articles'],
  });

  const unsaveMutation = useMutation({
    mutationFn: (articleId: string) => 
      apiRequest('POST', `/api/articles/${articleId}/unsave`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-articles'] });
      toast({
        title: "Article removed",
        description: "Article removed from saved list.",
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

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-home" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Bookmark className="h-8 w-8 text-blue-600" />
            Saved Articles
          </h1>
          <p className="text-slate-600 mt-2">
            Your personally curated collection of articles
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-slate-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : savedArticles.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bookmark className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-700 mb-2">
                No saved articles yet
              </h2>
              <p className="text-slate-500">
                Click the bookmark icon on any article to save it for later reading.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {savedArticles.map((article) => (
              <Card 
                key={article.id} 
                className="hover:shadow-lg transition-shadow duration-200"
                data-testid={`card-saved-article-${article.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-slate-900 mb-2 leading-tight">
                        {article.title}
                      </h3>
                      
                      <p className="text-slate-600 mb-4 line-clamp-3">
                        {article.summary}
                      </p>
                      
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {article.readTime} min read
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="font-medium text-slate-700">
                          {article.source}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="capitalize text-slate-600">
                          {article.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => unsaveMutation.mutate(article.id)}
                        disabled={unsaveMutation.isPending}
                        data-testid={`button-unsave-${article.id}`}
                        className="hover:bg-red-50 hover:text-red-600"
                      >
                        <BookmarkX className="h-5 w-5" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        data-testid={`button-read-${article.id}`}
                      >
                        <a 
                          href={article.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-5 w-5" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
