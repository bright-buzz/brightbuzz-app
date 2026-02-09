import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Filter,
  ShieldCheck,
  Ban,
  Check,
  Smile,
  Plus,
  Frown,
  Eye,
  RefreshCw,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type {
  Keyword,
  UserPreferences,
  FilterPreview,
  ReplacementPattern,
} from "@shared/schema";

export function KeywordFilterSection() {
  const [newBlockedKeyword, setNewBlockedKeyword] = useState("");
  const [newPrioritizedKeyword, setNewPrioritizedKeyword] = useState("");
  const [newReplacementFind, setNewReplacementFind] = useState("");
  const [newReplacementReplace, setNewReplacementReplace] = useState("");
  const [newReplacementCaseSensitive, setNewReplacementCaseSensitive] =
    useState(false);

  const { toast } = useToast();

  const { data: blockedKeywords = [] } = useQuery<Keyword[]>({
    queryKey: ["/api/keywords/blocked"],
  });

  const { data: prioritizedKeywords = [] } = useQuery<Keyword[]>({
    queryKey: ["/api/keywords/prioritized"],
  });

  const { data: preferences } = useQuery<UserPreferences>({
    queryKey: ["/api/preferences"],
  });

  const { data: replacementPatterns = [] } = useQuery<ReplacementPattern[]>({
    queryKey: ["/api/replacement-patterns"],
  });

  const { data: filterPreview } = useQuery<FilterPreview>({
    queryKey: ["/api/filter-preview"],
    enabled: !!preferences,
  });

  const addKeywordMutation = useMutation({
    mutationFn: (data: { keyword: string; type: string }) =>
      apiRequest("POST", "/api/keywords", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keywords"] });
      queryClient.invalidateQueries({ queryKey: ["/api/filter-preview"] });
      toast({ title: "Keyword added successfully" });
    },
  });

  const addReplacementPatternMutation = useMutation({
    mutationFn: (data: {
      findText: string;
      replaceText: string;
      caseSensitive: boolean;
    }) => apiRequest("POST", "/api/replacement-patterns", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/replacement-patterns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/filter-preview"] });
      toast({ title: "Replacement pattern added successfully" });
    },
  });

  // ✅ Use apiRequest so queryClient.ts handles VITE_API_URL correctly
  const deleteKeywordMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/keywords/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keywords/blocked"] });
      queryClient.invalidateQueries({ queryKey: ["/api/keywords/prioritized"] });
      queryClient.invalidateQueries({ queryKey: ["/api/filter-preview"] });
      toast({ title: "Keyword deleted successfully" });
    },
  });

  const deleteReplacementPatternMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/replacement-patterns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/replacement-patterns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/filter-preview"] });
      toast({ title: "Replacement pattern deleted successfully" });
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: (data: Partial<UserPreferences>) =>
      apiRequest("PUT", "/api/preferences", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/filter-preview"] });
    },
  });

  const handleAddBlockedKeyword = () => {
    if (newBlockedKeyword.trim()) {
      addKeywordMutation.mutate({
        keyword: newBlockedKeyword.trim(),
        type: "blocked",
      });
      setNewBlockedKeyword("");
    }
  };

  const handleAddPrioritizedKeyword = () => {
    if (newPrioritizedKeyword.trim()) {
      addKeywordMutation.mutate({
        keyword: newPrioritizedKeyword.trim(),
        type: "prioritized",
      });
      setNewPrioritizedKeyword("");
    }
  };

  const handleSentimentChange = (value: number[]) => {
    updatePreferencesMutation.mutate({ sentimentThreshold: value[0] / 100 });
  };

  const handleRealTimeToggle = (enabled: boolean) => {
    updatePreferencesMutation.mutate({ realTimeFiltering: enabled });
  };

  const handleAddReplacementPattern = () => {
    if (newReplacementFind.trim() && newReplacementReplace.trim()) {
      addReplacementPatternMutation.mutate({
        findText: newReplacementFind.trim(),
        replaceText: newReplacementReplace.trim(),
        caseSensitive: newReplacementCaseSensitive,
      });
      setNewReplacementFind("");
      setNewReplacementReplace("");
      setNewReplacementCaseSensitive(false);
    }
  };

  const handleDeleteReplacementPattern = (id: string) => {
    deleteReplacementPatternMutation.mutate(id);
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-warning to-amber-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Filter className="text-white text-lg" />
            <h2 className="text-xl font-bold text-white">
              Keyword Filter Preview
            </h2>
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
            <h3 className="text-lg font-semibold text-slate-900 mb-2 lg:mb-0">
              Filter Settings
            </h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-600">
                  Real-time filtering
                </span>
                <Switch
                  checked={preferences?.realTimeFiltering || false}
                  onCheckedChange={handleRealTimeToggle}
                  data-testid="switch-real-time-filter"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    className="bg-red-100 text-red-800 cursor-pointer hover:bg-red-200 flex items-center gap-1"
                    onClick={() => deleteKeywordMutation.mutate(keyword.id)}
                    data-testid={`badge-blocked-${keyword.keyword}`}
                  >
                    {keyword.keyword}
                    <span className="ml-1 text-xs hover:text-red-900">×</span>
                  </Badge>
                ))}
              </div>
              <div className="flex space-x-2">
                <Input
                  placeholder="Add keyword"
                  value={newBlockedKeyword}
                  onChange={(e) => setNewBlockedKeyword(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" && handleAddBlockedKeyword()
                  }
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
                    className="bg-green-100 text-green-800 cursor-pointer hover:bg-green-200 flex items-center gap-1"
                    onClick={() => deleteKeywordMutation.mutate(keyword.id)}
                    data-testid={`badge-prioritized-${keyword.keyword}`}
                  >
                    {keyword.keyword}
                    <span className="ml-1 text-xs hover:text-green-900">×</span>
                  </Badge>
                ))}
              </div>
              <div className="flex space-x-2">
                <Input
                  placeholder="Add keyword"
                  value={newPrioritizedKeyword}
                  onChange={(e) => setNewPrioritizedKeyword(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" && handleAddPrioritizedKeyword()
                  }
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
                  <span
                    className="font-medium text-slate-900"
                    data-testid="text-sentiment-threshold"
                  >
                    {Math.round((preferences?.sentimentThreshold || 0.7) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(preferences?.sentimentThreshold || 0.7) * 100}
                  onChange={(e) =>
                    handleSentimentChange([parseInt(e.target.value)])
                  }
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  data-testid="slider-sentiment-threshold"
                />
                <div className="text-xs text-slate-500">
                  Articles below this threshold will be filtered
                </div>
              </div>
            </Card>

            {/* Replacement Patterns */}
            <Card className="bg-purple-50 border-purple-200 p-4">
              <h4 className="text-sm font-medium text-purple-800 mb-3 flex items-center">
                <RefreshCw className="mr-2 h-4 w-4" />
                Word Replacements
              </h4>
              <div className="space-y-2 mb-3">
                {replacementPatterns.map((pattern) => (
                  <div
                    key={pattern.id}
                    className="bg-purple-100 text-purple-800 p-2 rounded text-xs cursor-pointer hover:bg-purple-200"
                    onClick={() => handleDeleteReplacementPattern(pattern.id)}
                    data-testid={`replacement-pattern-${pattern.id}`}
                  >
                    <div className="font-medium">
                      "{pattern.findText}" → "{pattern.replaceText}"
                    </div>
                    <div className="text-purple-600 mt-1">
                      {pattern.caseSensitive
                        ? "Case sensitive"
                        : "Case insensitive"}{" "}
                      • Click to remove
                    </div>
                  </div>
                ))}
                {replacementPatterns.length === 0 && (
                  <div className="text-xs text-purple-600 italic">
                    No replacements set
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Find text"
                    value={newReplacementFind}
                    onChange={(e) => setNewReplacementFind(e.target.value)}
                    className="text-xs"
                    data-testid="input-replacement-find"
                  />
                  <Input
                    placeholder="Replace with"
                    value={newReplacementReplace}
                    onChange={(e) => setNewReplacementReplace(e.target.value)}
                    className="text-xs"
                    data-testid="input-replacement-replace"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="case-sensitive"
                      checked={newReplacementCaseSensitive}
                      onChange={(e) =>
                        setNewReplacementCaseSensitive(e.target.checked)
                      }
                      className="w-3 h-3"
                      data-testid="checkbox-case-sensitive"
                    />
                    <label
                      htmlFor="case-sensitive"
                      className="text-xs text-purple-700"
                    >
                      Case sensitive
                    </label>
                  </div>
                  <Button
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={handleAddReplacementPattern}
                    disabled={
                      !newReplacementFind.trim() || !newReplacementReplace.trim()
                    }
                    data-testid="button-add-replacement-pattern"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
