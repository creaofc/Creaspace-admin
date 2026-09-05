import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Users, TrendingUp, Presentation, Calculator, LogOut } from "lucide-react";
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
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Sales", url: "/sales", icon: TrendingUp },
  { title: "Demos", url: "/demos", icon: Presentation },
  { title: "Price Finder", url: "/price-finder", icon: Calculator },
];

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Creā Logo" className="h-9 w-9 shrink-0 object-contain rounded-md" />
          {!collapsed && (
            <div className="min-w-0 flex flex-col justify-center">
              <div className="truncate text-base font-bold">
                Creā.
              </div>
              <div className="truncate text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                ERP System
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Workspace</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((it) => {
                const active = path === it.url || path.startsWith(it.url + "/");
                return (
                  <SidebarMenuItem key={it.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className="data-[active=true]:bg-primary/15 data-[active=true]:text-primary"
                      onClick={() => {
                        if (isMobile) setOpenMobile(false);
                      }}
                    >
                      <Link to={it.url} className="flex items-center gap-3">
                        <it.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="truncate">{it.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={async () => {
            if (isMobile) setOpenMobile(false);
            await logout();
            navigate({ to: "/login" });
          }}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
