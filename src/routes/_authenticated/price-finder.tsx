import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, KeyRound, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/price-finder")({
  ssr: false,
  head: () => ({ meta: [{ title: "Price Finder · Creā Space ERP" }] }),
  component: PriceFinderPage,
});

const CREDS = { id: "Price_Finder", password: "2026@Crea" };
const URL_LINK = "https://crea-price-estimation.lovable.app";

function PriceFinderPage() {
  const copy = (v: string, label: string) => { navigator.clipboard.writeText(v); toast.success(label + " copied"); };
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Price Finder</h1>
        <p className="text-sm text-muted-foreground">Access the external estimation tool.</p>
      </div>
      <Card className="glass p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: "var(--gradient-primary)" }}>
            <KeyRound className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">Access Credentials</h3>
            <p className="text-xs text-muted-foreground">Use these to log into the Price Finder app.</p>
          </div>
        </div>
        <div className="grid gap-3">
          <CredRow label="ID" value={CREDS.id} onCopy={() => copy(CREDS.id, "ID")} icon={<KeyRound className="h-4 w-4" />} />
          <CredRow label="Password" value={CREDS.password} onCopy={() => copy(CREDS.password, "Password")} icon={<Lock className="h-4 w-4" />} />
        </div>
        <Button className="w-full" onClick={() => window.open(URL_LINK, "_blank")} style={{ background: "var(--gradient-primary)" }}>
          <ExternalLink className="mr-2 h-4 w-4" /> Open Price Finder
        </Button>
      </Card>
    </div>
  );
}

function CredRow({ label, value, onCopy, icon }: { label: string; value: string; onCopy: () => void; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-muted-foreground shrink-0">{icon}</span>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="font-mono text-sm truncate">{value}</div>
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={onCopy}><Copy className="h-3 w-3 mr-1" /> Copy</Button>
    </div>
  );
}