import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { getAppsScriptUrl, setAppsScriptUrl, api } from "@/lib/sheets-api";
import { Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in · Creā Space ERP" }] }),
  component: () => (
    <AuthProvider>
      <LoginPage />
      <Toaster />
    </AuthProvider>
  ),
});

function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [scriptUrl, setScriptUrl] = useState("");
  const [needsUrl, setNeedsUrl] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const u = getAppsScriptUrl();
    if (!u) setNeedsUrl(true);
    else setScriptUrl(u);
  }, []);
  useEffect(() => { if (user) navigate({ to: "/dashboard" }); }, [user, navigate]);

  async function handleSaveUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!scriptUrl.includes("script.google.com")) {
      toast.error("Enter a valid Google Apps Script /exec URL");
      return;
    }
    setSubmitting(true);
    setAppsScriptUrl(scriptUrl);
    try {
      await api.ping();
      toast.success("Connected to Google Sheets");
      setNeedsUrl(false);
    } catch {
      toast.error("Could not reach the Apps Script. Check the URL & deployment.");
    } finally { setSubmitting(false); }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const ok = await login(email, password);
      if (ok) { toast.success("Welcome back"); navigate({ to: "/dashboard" }); }
      else toast.error("Invalid Email or Password");
    } catch (err: any) {
      toast.error(err?.message || "Login failed");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl text-2xl font-black text-primary-foreground shadow-2xl" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
            C
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            Cre<span className="italic">ā</span> <span className="gradient-text">Space</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Business Management System</p>
        </div>

        <Card className="glass p-6 sm:p-8">
          {needsUrl ? (
            <form onSubmit={handleSaveUrl} className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
                <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                <span>First-time setup: paste your Google Apps Script Web App URL. Script code is at <code className="text-primary">public/apps-script/Code.gs</code>.</span>
              </div>
              <div>
                <Label>Apps Script /exec URL</Label>
                <Input value={scriptUrl} onChange={(e) => setScriptUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" className="mt-1.5" required />
              </div>
              <Button type="submit" className="w-full" disabled={submitting} style={{ background: "var(--gradient-primary)" }}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Connect
              </Button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="mt-1.5" required />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="mt-1.5" required />
              </div>
              <Button type="submit" className="w-full" disabled={submitting} style={{ background: "var(--gradient-primary)" }}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign in
              </Button>
              <button type="button" onClick={() => setNeedsUrl(true)} className="block w-full text-center text-xs text-muted-foreground hover:text-foreground">
                Reconfigure Apps Script URL
              </button>
            </form>
          )}
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Internal use only · Cre<span className="italic">ā</span> Space Digital Solutions
        </p>
      </div>
    </div>
  );
}