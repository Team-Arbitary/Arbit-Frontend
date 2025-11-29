import { Search, User, LogOut, Bell, Sun, Moon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useEffect, useState } from "react";
import { api, API_ENDPOINTS } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/ThemeProvider";
import { Badge } from "@/components/ui/badge";
import DarkVeil from "@/components/ui/DarkVeil";

interface LayoutProps {
  children: React.ReactNode;
}

type UserProfile = {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  department: string;
};

export function Layout({ children }: LayoutProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const { logout, setUser: setAuthUser } = useAuth();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(API_ENDPOINTS.USER_PROFILE);
        const data = res.data;
        if (data && data.responseData) {
          setUser(data.responseData);
          setAuthUser(data.responseData);
        }
      } catch (error) {
        console.error("Failed to fetch user profile", error);
        // Don't logout here - the interceptor will handle 401/403
      }
    };
    fetchProfile();
  }, [setAuthUser]);

  const handleLogout = () => {
    logout("You have been logged out successfully.");
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role?.toLowerCase()) {
      case 'role_admin':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'role_engineer':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-green-500/20 text-green-400 border-green-500/30';
    }
  };

  const formatRole = (role?: string) => {
    if (!role) return 'User';
    return role.replace('ROLE_', '').charAt(0) + role.replace('ROLE_', '').slice(1).toLowerCase();
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full relative">
        {/* Dark Veil Background - only show in dark mode */}
        {theme === 'dark' && (
          <div className="fixed inset-0 z-0">
            <DarkVeil
              hueShift={20}
              speed={0.3}
              noiseIntensity={0.05}
              warpAmount={0.3}
              resolutionScale={0.8}
            />
          </div>
        )}
        
        {/* Overlay for better content visibility */}
        <div className={`fixed inset-0 z-[1] pointer-events-none ${theme === 'dark' ? 'bg-black/70' : 'bg-gradient-to-br from-orange-50/80 via-white/90 to-orange-100/80'}`} />
        
        <AppSidebar user={user} />
        
        <div className="flex-1 flex flex-col relative z-10">
          {/* Header */}
          <header className="bg-card/80 backdrop-blur-xl border-b border-border/50 h-16 flex items-center px-6 sticky top-0 z-40">
            <div className="flex items-center gap-4 flex-1">
              <SidebarTrigger className="-ml-2 text-muted-foreground hover:text-foreground" />
              
              <div className="flex items-center gap-4 ml-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search transformers, inspections..."
                    className="pl-10 w-72 bg-secondary/50 border-border/50 focus:border-orange-500/50 focus:ring-orange-500/20 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="text-muted-foreground hover:text-foreground"
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>

              {/* Notifications */}
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" />
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-3 h-auto py-2 px-3 hover:bg-secondary/50">
                    <Avatar className="h-8 w-8 border-2 border-orange-500/30">
                      <AvatarImage src="/user2.jpg" />
                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-sm font-medium">
                        {getInitials(user?.fullName || user?.username)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="text-left hidden md:block">
                      <div className="font-medium text-sm text-foreground">{user?.fullName || user?.username || "User"}</div>
                      <div className="text-xs text-muted-foreground">{user?.email || "No email"}</div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-card/95 backdrop-blur-xl border-border/50">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{user?.fullName || user?.username}</p>
                        <Badge variant="outline" className={`text-xs ${getRoleBadgeColor(user?.role)}`}>
                          {formatRole(user?.role)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                      {user?.department && (
                        <p className="text-xs text-muted-foreground">Department: {user.department}</p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 bg-transparent">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}