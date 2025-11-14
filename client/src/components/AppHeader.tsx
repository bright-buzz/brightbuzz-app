import { Newspaper, Shield, Settings, LogOut, User as UserIcon, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AppHeaderProps {
  filteredCount: number;
}

export function AppHeader({ filteredCount }: AppHeaderProps) {
  const { user } = useAuth();
  const typedUser = user as User | undefined;

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
            
            <Link href="/saved">
              <Button 
                variant="outline"
                data-testid="button-saved"
              >
                <Bookmark className="text-sm mr-2" />
                <span className="hidden sm:block">Saved</span>
              </Button>
            </Link>
            
            <Link href="/settings">
              <Button 
                className="bg-primary hover:bg-blue-700"
                data-testid="button-settings"
              >
                <Settings className="text-sm mr-2" />
                <span className="hidden sm:block">Settings</span>
              </Button>
            </Link>

            {typedUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full" data-testid="button-user-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={typedUser.profileImageUrl || ""} alt={typedUser.firstName || "User"} />
                      <AvatarFallback>
                        {typedUser.firstName?.charAt(0) || typedUser.email?.charAt(0) || <UserIcon className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium text-sm" data-testid="text-user-name">
                        {typedUser.firstName && typedUser.lastName 
                          ? `${typedUser.firstName} ${typedUser.lastName}` 
                          : typedUser.email || "User"}
                      </p>
                      {typedUser.email && (
                        <p className="w-[200px] truncate text-xs text-muted-foreground" data-testid="text-user-email">
                          {typedUser.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => window.location.href = '/api/logout'}
                    className="cursor-pointer"
                    data-testid="button-logout"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
