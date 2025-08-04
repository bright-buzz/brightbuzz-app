import { Newspaper, Shield, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppHeaderProps {
  filteredCount: number;
}

export function AppHeader({ filteredCount }: AppHeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Newspaper className="text-white text-sm" />
              </div>
              <h1 className="text-xl font-bold text-slate-900" data-testid="text-app-title">BrightBuzz</h1>
            </div>
            <span className="text-sm text-slate-500 hidden sm:block">Stay informed, not overwhelmed.</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 bg-slate-100 rounded-full px-3 py-1">
              <Shield className="text-secondary text-sm" />
              <span className="text-sm font-medium text-slate-700" data-testid="text-filtered-count">
                {filteredCount} articles filtered today
              </span>
            </div>
            
            <Button 
              className="bg-primary hover:bg-blue-700"
              data-testid="button-settings"
            >
              <Settings className="text-sm mr-2" />
              <span className="hidden sm:block">Settings</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
