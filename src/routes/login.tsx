import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const ok = await login(email, password);
      if (ok) {
        toast.success("Welcome back");
        navigate({ to: "/dashboard" });
      }
    } catch (error) {
      const err = error as { code?: string };
      if (
        err?.code === "auth/invalid-credential" ||
        err?.code === "auth/user-not-found" ||
        err?.code === "auth/wrong-password" ||
        err?.code === "auth/invalid-email"
      ) {
        toast.error("Invalid email or password");
      } else if (err?.code === "auth/too-many-requests") {
        toast.error("Too many failed attempts. Please try again later.");
      } else if (err?.code === "auth/network-request-failed") {
        toast.error("Network error. Please check your connection.");
      } else {
        toast.error("Login failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src="/logo.png" alt="Creā Logo" className="h-32 w-auto object-contain" />
          <p className="mt-2 text-sm text-muted-foreground">Business Management System</p>
        </div>

        <Card className="glass p-6 sm:p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="mt-1.5"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={submitting}
              style={{ background: "var(--gradient-primary)" }}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Internal use only · Creā. Digital Solutions
        </p>
      </div>
    </div>
  );
}
