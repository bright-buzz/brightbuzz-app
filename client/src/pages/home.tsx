import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { CuratedFeedSection } from "@/components/CuratedFeedSection";
import { TopFivePreviewSection } from "@/components/TopFivePreviewSection";
import { PodcastSection } from "@/components/PodcastSection";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { FilterPreview } from "@shared/schema";

export default function Home() {
  const { data: preferences } = useQuery({
    queryKey: ['/api/preferences'],
  });

  const { data: filterStats } = useQuery<FilterPreview>({
    queryKey: ['/api/filter-preview'],
    enabled: !!preferences,
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
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40">
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
