import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function StatCard({
  label, value, icon: Icon, accent, hint,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  accent?: "primary" | "accent" | "emerald" | "amber";
  hint?: string;
}) {
  const grad =
    accent === "accent" ? "var(--gradient-accent)"
    : accent === "emerald" ? "linear-gradient(135deg, oklch(0.65 0.15 160), oklch(0.55 0.18 170))"
    : accent === "amber" ? "linear-gradient(135deg, oklch(0.75 0.18 70), oklch(0.65 0.2 40))"
    : "var(--gradient-primary)";
  return (
    <Card className="glass relative overflow-hidden p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: grad }} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-bold tracking-tight truncate">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground truncate">{hint}</div>}
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: grad }}>
          <Icon className="h-5 w-5 text-primary-foreground" />
        </div>
      </div>
    </Card>
  );
}