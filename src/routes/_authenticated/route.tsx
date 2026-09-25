import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useErpData } from "@/lib/use-erp-data";
import { useState } from "react";

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

  return <AuthenticatedContent />;
}

function AuthenticatedContent() {
  const { user } = useAuth();
  const { data, isLoading } = useErpData();
  const [toastShown, setToastShown] = useState(false);

  useEffect(() => {
    if (!isLoading && data && user && !toastShown) {
      const myTasks = data.tasks.filter(t => t.assignedTo === user.email);
      const pendingTasks = myTasks.filter(t => t.status === "Pending" || t.status === "In Progress");
      
      if (pendingTasks.length > 0) {
        toast.info(
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-primary">Pending Tasks</span>
            <span className="text-sm text-muted-foreground">You have {pendingTasks.length} task{pendingTasks.length > 1 ? 's' : ''} to complete.</span>
          </div>, 
          { 
            duration: 6000,
            icon: '📋',
          }
        );
      }
      setToastShown(true);
    }
  }, [isLoading, data, user, toastShown]);

  // Record daily login to Apps Script
  useEffect(() => {
    if (user) {
      const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD format
      const lastLogged = localStorage.getItem("lastLoginLogged");
      
      if (lastLogged !== today) {
        const scriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL;
        if (scriptUrl && scriptUrl.includes("/macros/s/") && !scriptUrl.includes("YOUR_SCRIPT_ID")) {
          fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
              type: "log_login",
              email: user.email,
              date: today
            })
          }).then(() => {
            localStorage.setItem("lastLoginLogged", today);
          }).catch(console.error);
        }
      }
    }
  }, [user]);

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
