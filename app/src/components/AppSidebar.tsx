import { NavLink, useLocation } from "react-router-dom";
import { Settings, BarChart3, FileBox, Zap } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Overview", url: "/dashboard", icon: BarChart3 },
  { title: "Transformers", url: "/dashboard?tab=transformers", icon: Zap },
  { title: "Inspections", url: "/dashboard?tab=inspections", icon: FileBox },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/dashboard") return currentPath === "/dashboard" && !location.search;
    if (path.includes("?tab=")) {
      return location.search.includes(path.split("?")[1]);
    }
    return currentPath.startsWith(path);
  };

  const getNavClassName = (path: string) =>
    isActive(path) 
      ? "bg-gradient-to-r from-orange-600/20 to-orange-500/20 text-orange-500 font-medium border-l-2 border-orange-500" 
      : "hover:bg-white/5 text-gray-300";

  return (
    <Sidebar collapsible="icon" className="[--sidebar-width-icon:60px] backdrop-blur-xl bg-black/60 border-r border-white/10">
      <SidebarHeader className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          {!isCollapsed && (
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">Arbit</span>
              <p className="text-xs text-gray-400">Thermal Analytics</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-500 text-xs uppercase px-4">Navigation</SidebarGroupLabel>
          <SidebarGroupContent className="mt-2">
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url.split("?")[0] + (item.url.includes("?") ? "?" + item.url.split("?")[1] : "")}
                      className={`${getNavClassName(item.url)} transition-all duration-200 rounded-r-lg mx-2`}
                    >
                      <item.icon className="h-5 w-5" />
                      {!isCollapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-600 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-white">HG</span>
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">Hasitha Gallella</div>
              <div className="text-xs text-gray-400 truncate">hasitha@gmail.com</div>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
