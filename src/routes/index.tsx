import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    try {
      const session = localStorage.getItem("crea_session");
      const url = localStorage.getItem("crea_apps_script_url");
      if (session && url) navigate({ to: "/dashboard" });
      else navigate({ to: "/login" });
    } catch {
      navigate({ to: "/login" });
    }
  }, [navigate]);
  return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
}
