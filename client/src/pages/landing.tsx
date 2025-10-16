import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Zap, Headphones, TrendingUp, Star, Clock } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900">BrightBuzz</h1>
            </div>
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              data-testid="button-login"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="pt-20 pb-16">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm">
              <Star className="h-4 w-4 mr-2" />
              AI-Powered News Curation Across All Categories
            </Badge>
            
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
              Stay Informed, Stay
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Positive</span>
            </h1>
            
            <p className="text-xl text-slate-600 mb-8 leading-relaxed">
              BrightBuzz curates news from all categories using AI to filter out anxiety-inducing content, 
              keeping you informed across world news, technology, sports, entertainment, health, and more while protecting your mental health.
            </p>
            
            <div className="flex flex-col items-center justify-center gap-4 mb-4">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button 
                  size="lg" 
                  onClick={() => window.location.href = '/api/login'}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-3 text-lg"
                  data-testid="button-get-started"
                >
                  Get Started Free
                </Button>
                <Button variant="outline" size="lg" className="px-8 py-3 text-lg">
                  Learn More
                </Button>
              </div>
              <p className="text-sm text-slate-500">
                Sign in with Gmail, Apple, GitHub, X, or email
              </p>
            </div>

            <div className="flex items-center justify-center space-x-8 text-sm text-slate-500">
              <div className="flex items-center">
                <Shield className="h-4 w-4 mr-2 text-green-500" />
                Anxiety-Free Content
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-blue-500" />
                5-Min Daily Digests
              </div>
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 mr-2 text-purple-500" />
                All News Categories
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Everything you need to stay informed
            </h2>
            <p className="text-lg text-slate-600">
              Powerful features designed specifically for young professionals
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-8 border-slate-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Smart Filtering</h3>
              <p className="text-slate-600 leading-relaxed">
                AI-powered sentiment analysis removes anxiety-inducing content while preserving important updates across all news categories that matter to you.
              </p>
            </Card>

            <Card className="p-8 border-slate-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Real-Time Curation</h3>
              <p className="text-slate-600 leading-relaxed">
                Get comprehensive news coverage curated from trusted sources like Reuters, BBC, CNN, ESPN, and dozens of other quality publications.
              </p>
            </Card>

            <Card className="p-8 border-slate-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <Headphones className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Daily Podcasts</h3>
              <p className="text-slate-600 leading-relaxed">
                Daily 5-10 minute podcasts summarizing the most important stories across all categories with balanced, comprehensive coverage.
              </p>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">
              Ready to transform your news consumption?
            </h2>
            <p className="text-lg text-slate-600 mb-8">
              Join thousands of readers who stay informed across all topics without the anxiety.
            </p>
            <div className="flex flex-col items-center gap-3">
              <Button 
                size="lg" 
                onClick={() => window.location.href = '/api/login'}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-3 text-lg"
                data-testid="button-cta-signup"
              >
                Start Your Free Account
              </Button>
              <p className="text-sm text-slate-500">
                Sign in with Gmail, Apple, GitHub, X, or email
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <span className="text-xl font-bold text-white">BrightBuzz</span>
            </div>
            <p className="text-slate-400">
              AI-powered news curation across all categories
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}