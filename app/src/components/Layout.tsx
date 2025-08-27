import { Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-background border-b border-border h-16 flex items-center px-6">
            <div className="flex items-center gap-4 flex-1">
              <SidebarTrigger className="-ml-2" />
              
              <div className="flex items-center gap-4 ml-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search Sites"
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src="/user2.jpg" />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              
              <div className="text-sm">
                <div className="font-medium">Hasitha Gallella</div>
                <div className="text-muted-foreground">hasitha@gmail.com</div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}