import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Shield, CheckCircle, Ban, Settings } from "lucide-react";
import { Link } from "wouter";
import type { FilterPreview } from "@shared/schema";

export function FilterEffectivenessSection() {
  const { data: filterStats, isLoading } = useQuery<FilterPreview>({
    queryKey: ['/api/filter-preview'],
  });

  if (isLoading) {
    return (
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
          <div className="flex items-center space-x-3">
            <TrendingUp className="text-white text-lg" />
            <h2 className="text-xl font-bold text-white">Filter Effectiveness</h2>
            <Badge variant="secondary" className="bg-white/20 text-white">
              Live Stats
            </Badge>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="bg-slate-50 p-4 animate-pulse">
                <div className="h-8 bg-slate-200 rounded mb-2"></div>
                <div className="h-4 bg-slate-200 rounded"></div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const stats = filterStats?.stats;

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <TrendingUp className="text-white text-lg" />
            <h2 className="text-xl font-bold text-white">Filter Effectiveness</h2>
            <Badge variant="secondary" className="bg-white/20 text-white">
              Live Stats
            </Badge>
          </div>
          <Link href="/settings">
            <Button variant="secondary" size="sm" className="bg-white/20 text-white hover:bg-white/30" data-testid="button-manage-filters">
              <Settings className="h-4 w-4 mr-2" />
              Manage Filters
            </Button>
          </Link>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Articles Filtered */}
          <Card className="bg-red-50 border-red-200 p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Ban className="h-5 w-5 text-red-600 mr-2" />
              <div className="text-2xl font-bold text-red-600" data-testid="stat-filtered">
                {stats?.filteredCount || 0}
              </div>
            </div>
            <div className="text-sm text-red-700 font-medium">Articles Filtered</div>
            <div className="text-xs text-red-600 mt-1">Anxiety-inducing content removed</div>
          </Card>

          {/* Articles Passed */}
          <Card className="bg-green-50 border-green-200 p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <div className="text-2xl font-bold text-green-600" data-testid="stat-passed">
                {stats?.passedCount || 0}
              </div>
            </div>
            <div className="text-sm text-green-700 font-medium">Articles Passed</div>
            <div className="text-xs text-green-600 mt-1">Quality content delivered</div>
          </Card>

          {/* Average Sentiment */}
          <Card className="bg-blue-50 border-blue-200 p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
              <div className="text-2xl font-bold text-blue-600" data-testid="stat-avg-sentiment">
                {Math.round((stats?.avgSentiment || 0) * 100)}%
              </div>
            </div>
            <div className="text-sm text-blue-700 font-medium">Avg Positivity</div>
            <div className="text-xs text-blue-600 mt-1">Sentiment after filtering</div>
          </Card>

          {/* Anxiety Reduction */}
          <Card className="bg-purple-50 border-purple-200 p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Shield className="h-5 w-5 text-purple-600 mr-2" />
              <div className="text-2xl font-bold text-purple-600" data-testid="stat-anxiety-reduction">
                {stats?.anxietyReduction || 0}%
              </div>
            </div>
            <div className="text-sm text-purple-700 font-medium">Anxiety Reduction</div>
            <div className="text-xs text-purple-600 mt-1">Stress content eliminated</div>
          </Card>
        </div>

        {/* Summary Text */}
        <Card className="bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-slate-700">
                Your filters processed <span className="font-semibold text-slate-900">{stats?.totalArticles || 0} articles</span> today, 
                removing <span className="font-semibold text-red-600">{stats?.filteredCount || 0} anxiety-inducing pieces</span> and 
                delivering <span className="font-semibold text-green-600">{stats?.passedCount || 0} positive articles</span> with 
                an average sentiment of <span className="font-semibold text-blue-600">{Math.round((stats?.avgSentiment || 0) * 100)}%</span>.
              </p>
            </div>
            <Link href="/settings">
              <Button variant="outline" size="sm" className="ml-4 shrink-0" data-testid="button-adjust-filters">
                Adjust Filters
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </section>
  );
}