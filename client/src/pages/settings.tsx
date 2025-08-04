import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Filter, ShieldCheck, Ban, Check, Smile, Plus, Frown, Eye } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Keyword, UserPreferences, FilterPreview } from "@shared/schema";

export default function Settings() {
  const [newBlockedKeyword, setNewBlockedKeyword] = useState("");
  const [newPrioritizedKeyword, setNewPrioritizedKeyword] = useState("");
  const { toast } = useToast();

  const { data: blockedKeywords = [] } = useQuery<Keyword[]>({
    queryKey: ['/api/keywords/blocked'],
  });

  const { data: prioritizedKeywords = [] } = useQuery<Keyword[]>({
    queryKey: ['/api/keywords/prioritized'],
  });

  const { data: preferences } = useQuery<UserPreferences>({
    queryKey: ['/api/preferences'],
  });

  const { data: filterPreview } = useQuery<FilterPreview>({
    queryKey: ['/api/filter-preview'],
    enabled: !!preferences,
  });

  const addKeywordMutation = useMutation({
    mutationFn: (data: { keyword: string; type: string }) =>
      apiRequest('POST', '/api/keywords', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/keywords'] });
      queryClient.invalidateQueries({ queryKey: ['/api/filter-preview'] });
      toast({ title: "Keyword added successfully" });
    },
  });

  const deleteKeywordMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/keywords/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/keywords'] });
      queryClient.invalidateQueries({ queryKey: ['/api/filter-preview'] });
      toast({ title: "Keyword removed successfully" });
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: (data: Partial<UserPreferences>) =>
      apiRequest('PUT', '/api/preferences', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/preferences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/filter-preview'] });
    },
  });

  const handleAddBlockedKeyword = () => {
    if (newBlockedKeyword.trim()) {
      addKeywordMutation.mutate({ keyword: newBlockedKeyword.trim(), type: 'blocked' });
      setNewBlockedKeyword("");
    }
  };

  const handleAddPrioritizedKeyword = () => {
    if (newPrioritizedKeyword.trim()) {
      addKeywordMutation.mutate({ keyword: newPrioritizedKeyword.trim(), type: 'prioritized' });
      setNewPrioritizedKeyword("");
    }
  };

  const handleSentimentChange = (value: number[]) => {
    updatePreferencesMutation.mutate({ sentimentThreshold: value[0] / 100 });
  };

  const handleRealTimeToggle = (enabled: boolean) => {
    updatePreferencesMutation.mutate({ realTimeFiltering: enabled });
  };

  const handleDeleteKeyword = (id: string) => {
    deleteKeywordMutation.mutate(id);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm" data-testid="button-back-home">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-slate-900" data-testid="text-settings-title">
                Settings
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Filter Settings */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-warning to-amber-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Filter className="text-white text-lg" />
                <h2 className="text-xl font-bold text-white">Filter Settings</h2>
                <Badge variant="secondary" className="bg-white/20 text-white">
                  Real-time
                </Badge>
              </div>
              <div className="flex items-center space-x-4 text-white text-sm">
                <div className="flex items-center space-x-1">
                  <ShieldCheck className="h-4 w-4" />
                  <span data-testid="text-filtered-articles">
                    {filterPreview?.stats?.filteredCount || 0} articles filtered
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {/* Filter Controls */}
            <div className="mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-2 lg:mb-0">Filter Controls</h3>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-slate-600">Real-time filtering</span>
                    <Switch
                      checked={preferences?.realTimeFiltering || false}
                      onCheckedChange={handleRealTimeToggle}
                      data-testid="switch-real-time-filter"
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Blocked Keywords */}
                <Card className="bg-red-50 border-red-200 p-4">
                  <h4 className="text-sm font-medium text-red-800 mb-3 flex items-center">
                    <Ban className="mr-2 h-4 w-4" />
                    Blocked Keywords
                  </h4>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {blockedKeywords.map((keyword) => (
                      <Badge 
                        key={keyword.id} 
                        variant="destructive" 
                        className="bg-red-100 text-red-800 cursor-pointer hover:bg-red-200"
                        onClick={() => handleDeleteKeyword(keyword.id)}
                        data-testid={`badge-blocked-${keyword.keyword}`}
                      >
                        {keyword.keyword} ×
                      </Badge>
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Add keyword"
                      value={newBlockedKeyword}
                      onChange={(e) => setNewBlockedKeyword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddBlockedKeyword()}
                      className="text-xs"
                      data-testid="input-blocked-keyword"
                    />
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={handleAddBlockedKeyword}
                      data-testid="button-add-blocked-keyword"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </Card>

                {/* Prioritized Keywords */}
                <Card className="bg-green-50 border-green-200 p-4">
                  <h4 className="text-sm font-medium text-green-800 mb-3 flex items-center">
                    <Check className="mr-2 h-4 w-4" />
                    Prioritized Keywords
                  </h4>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {prioritizedKeywords.map((keyword) => (
                      <Badge 
                        key={keyword.id} 
                        variant="secondary" 
                        className="bg-green-100 text-green-800 cursor-pointer hover:bg-green-200"
                        onClick={() => handleDeleteKeyword(keyword.id)}
                        data-testid={`badge-prioritized-${keyword.keyword}`}
                      >
                        {keyword.keyword} ×
                      </Badge>
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Add keyword"
                      value={newPrioritizedKeyword}
                      onChange={(e) => setNewPrioritizedKeyword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddPrioritizedKeyword()}
                      className="text-xs"
                      data-testid="input-prioritized-keyword"
                    />
                    <Button 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={handleAddPrioritizedKeyword}
                      data-testid="button-add-prioritized-keyword"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </Card>

                {/* Sentiment Filter */}
                <Card className="bg-blue-50 border-blue-200 p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center">
                    <Smile className="mr-2 h-4 w-4" />
                    Sentiment Filter
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Minimum positivity</span>
                      <span className="font-medium text-slate-900" data-testid="text-sentiment-threshold">
                        {Math.round((preferences?.sentimentThreshold || 0.7) * 100)}%
                      </span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={(preferences?.sentimentThreshold || 0.7) * 100}
                      onChange={(e) => handleSentimentChange([parseInt(e.target.value)])}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      data-testid="slider-sentiment-threshold"
                    />
                    <div className="text-xs text-slate-500">
                      Articles below this threshold will be filtered
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Filter Preview */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
            <div className="flex items-center space-x-3">
              <Eye className="text-white text-lg" />
              <h2 className="text-xl font-bold text-white">Filter Preview</h2>
              <Badge variant="secondary" className="bg-white/20 text-white">
                Live Data
              </Badge>
            </div>
          </div>

          <div className="p-6">
            {/* Before/After Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Before Filtering */}
              <Card className="bg-slate-50 p-4">
                <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center">
                  <Eye className="mr-2 h-4 w-4" />
                  Before Filtering
                  <Badge variant="secondary" className="ml-auto bg-slate-200 text-slate-700">
                    {filterPreview?.original?.length || 0} articles
                  </Badge>
                </h4>
                
                <div className="space-y-3">
                  {filterPreview?.original?.slice(0, 3).map((article: any, index: number) => (
                    <Card key={index} className="bg-white p-3 border border-slate-200">
                      <h5 className="text-sm font-medium text-slate-900 mb-1">{article.title}</h5>
                      <p className="text-xs text-slate-600 mb-2 line-clamp-2">{article.summary}</p>
                      <div className="flex items-center text-xs text-slate-500">
                        <Badge variant={article.sentiment < 0.5 ? "destructive" : "secondary"} className="mr-2">
                          {article.category}
                        </Badge>
                        <span className="flex items-center">
                          {article.sentiment < 0.5 ? (
                            <Frown className="h-3 w-3 text-red-500 mr-1" />
                          ) : (
                            <Smile className="h-3 w-3 text-green-500 mr-1" />
                          )}
                          {Math.round(article.sentiment * 100)}% positive
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </Card>

              {/* After Filtering */}
              <Card className="bg-secondary/10 p-4">
                <h4 className="text-sm font-medium text-secondary mb-3 flex items-center">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  After Filtering
                  <Badge variant="secondary" className="ml-auto bg-secondary text-white">
                    {filterPreview?.filtered?.length || 0} articles
                  </Badge>
                </h4>
                
                <div className="space-y-3">
                  {filterPreview?.filtered?.slice(0, 3).map((article: any, index: number) => (
                    <Card key={index} className="bg-white p-3 border border-green-200 shadow-sm">
                      <h5 className="text-sm font-medium text-slate-900 mb-1">{article.title}</h5>
                      <p className="text-xs text-slate-600 mb-2 line-clamp-2">{article.summary}</p>
                      <div className="flex items-center text-xs text-slate-500">
                        <Badge className="bg-green-100 text-green-700 mr-2">
                          {article.category}
                        </Badge>
                        <span className="flex items-center">
                          <Smile className="h-3 w-3 text-green-500 mr-1" />
                          {Math.round(article.sentiment * 100)}% positive
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </Card>
            </div>
            
            {/* Quick Stats Summary */}
            <Card className="bg-slate-50 p-4">
              <h4 className="text-sm font-medium text-slate-700 mb-3">Current Filter Impact</h4>
              <p className="text-sm text-slate-600">
                Your current settings are filtering <span className="font-semibold text-red-600">{filterPreview?.stats?.filteredCount || 0}</span> of <span className="font-semibold">{filterPreview?.stats?.totalArticles || 0}</span> articles, 
                maintaining an average sentiment of <span className="font-semibold text-blue-600">{Math.round((filterPreview?.stats?.avgSentiment || 0) * 100)}%</span> 
                and reducing anxiety-inducing content by <span className="font-semibold text-purple-600">{filterPreview?.stats?.anxietyReduction || 0}%</span>.
              </p>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}