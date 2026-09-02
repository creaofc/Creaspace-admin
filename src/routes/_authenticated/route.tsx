import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: () => (
    <AuthProvider>
      <Guarded />
    </AuthProvider>
  ),
});

function Guarded() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl">
            <SidebarTrigger />
            <div className="flex-1" />
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live · Firebase
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
          <Toaster />
        </div>
      </div>
    </SidebarProvider>
  );
}
