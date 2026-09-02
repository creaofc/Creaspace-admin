import { createFileRoute } from "@tanstack/react-router";
import { useErpData, fmtMoney, fmtDate } from "@/lib/use-erp-data";
import { StatCard } from "@/components/erp/stat-card";
import {
  Users,
  UserCheck,
  CheckCircle2,
  Clock,
  IndianRupee,
  Wallet,
  TrendingUp,
  Calendar,
  Activity,
  Receipt,
  Percent,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  head: () => ({ meta: [{ title: "Dashboard · Creā Space ERP" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useErpData();
  const clients = data?.clients ?? [];
  const payments = data?.payments ?? [];
  const expenses = data?.expenses ?? [];
  const demos = data?.demos ?? [];
  const logs = data?.logs ?? [];

  const totals = useMemo(() => {
    const totalRevenue = clients.reduce((s, c) => s + (Number(c["Project Price"]) || 0), 0);
    const remaining = clients.reduce((s, c) => s + (Number(c["Remaining Payment"]) || 0), 0);
    const collected = totalRevenue - remaining;
    const expensesTotal = expenses.reduce((s, e) => s + (Number(e["Expense Amount"]) || 0), 0);
    const netProfit = collected - expensesTotal;
    const active = clients.filter((c) => c["Payment Status"] !== "Completed").length;
    const completed = clients.filter((c) => c["Payment Status"] === "Completed").length;
    const pending = clients.length - completed;
    const now = new Date();
    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const currentMonth = monthKey(now);
    const currentYear = String(now.getFullYear());
    const monthlyRevenue = payments
      .filter((p) => monthKey(new Date(p["Payment Date"])) === currentMonth)
      .reduce((s, p) => s + (Number(p["Payment Amount"]) || 0), 0);
    const yearlyRevenue = payments
      .filter((p) => new Date(p["Payment Date"]).getFullYear().toString() === currentYear)
      .reduce((s, p) => s + (Number(p["Payment Amount"]) || 0), 0);
    return {
      totalRevenue,
      remaining,
      collected,
      expensesTotal,
      netProfit,
      active,
      completed,
      pending,
      monthlyRevenue,
      yearlyRevenue,
    };
  }, [clients, payments, expenses]);

  const monthly = useMemo(() => {
    const map = new Map<string, { month: string; revenue: number; expenses: number }>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, {
        month: d.toLocaleDateString("en-IN", { month: "short" }),
        revenue: 0,
        expenses: 0,
      });
    }
    payments.forEach((p) => {
      const d = new Date(p["Payment Date"]);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const row = map.get(key);
      if (row) row.revenue += Number(p["Payment Amount"]) || 0;
    });
    expenses.forEach((e) => {
      const d = new Date(e["Expense Date"]);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const row = map.get(key);
      if (row) row.expenses += Number(e["Expense Amount"]) || 0;
    });
    return Array.from(map.values());
  }, [payments, expenses]);

  const pieData = [
    { name: "Completed", value: totals.completed },
    { name: "Pending", value: totals.pending },
  ];
  const pieColors = ["oklch(0.65 0.2 160)", "oklch(0.65 0.28 25)"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Real-time overview from Google Sheets.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard label="Total Clients" value={clients.length} icon={Users} accent="primary" />
        <StatCard label="Active Clients" value={totals.active} icon={UserCheck} accent="primary" />
        <StatCard label="Completed" value={totals.completed} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Pending" value={totals.pending} icon={Clock} accent="amber" />
        <StatCard
          label="Total Revenue"
          value={fmtMoney(totals.totalRevenue)}
          icon={IndianRupee}
          accent="primary"
        />
        <StatCard
          label="Collected"
          value={fmtMoney(totals.collected)}
          icon={Wallet}
          accent="emerald"
        />
        <StatCard
          label="Remaining"
          value={fmtMoney(totals.remaining)}
          icon={Clock}
          accent="amber"
        />
        <StatCard
          label="Monthly Revenue"
          value={fmtMoney(totals.monthlyRevenue)}
          icon={Calendar}
          accent="primary"
        />
        <StatCard
          label="Yearly Revenue"
          value={fmtMoney(totals.yearlyRevenue)}
          icon={TrendingUp}
          accent="primary"
        />
        <StatCard
          label="Expenses"
          value={fmtMoney(totals.expensesTotal)}
          icon={Receipt}
          accent="accent"
        />
        <StatCard
          label="Net Profit"
          value={fmtMoney(totals.netProfit)}
          icon={Percent}
          accent="emerald"
        />
        <StatCard label="Activity Logs" value={logs.length} icon={Activity} accent="primary" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass p-5">
          <h3 className="mb-3 text-sm font-semibold">Monthly Revenue</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.05 285 / 30%)" />
                <XAxis dataKey="month" stroke="oklch(0.7 0.02 280)" fontSize={12} />
                <YAxis stroke="oklch(0.7 0.02 280)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.14 0.015 280)",
                    border: "1px solid oklch(0.35 0.08 285 / 40%)",
                    borderRadius: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="oklch(0.65 0.28 290)"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="glass p-5">
          <h3 className="mb-3 text-sm font-semibold">Monthly Expenses</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.05 285 / 30%)" />
                <XAxis dataKey="month" stroke="oklch(0.7 0.02 280)" fontSize={12} />
                <YAxis stroke="oklch(0.7 0.02 280)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.14 0.015 280)",
                    border: "1px solid oklch(0.35 0.08 285 / 40%)",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="expenses" fill="oklch(0.65 0.28 25)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="glass p-5">
          <h3 className="mb-3 text-sm font-semibold">Payments Split</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  innerRadius={55}
                  paddingAngle={4}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={pieColors[i]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.14 0.015 280)",
                    border: "1px solid oklch(0.35 0.08 285 / 40%)",
                    borderRadius: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="glass p-5">
          <h3 className="mb-3 text-sm font-semibold">Revenue Growth</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.65 0.28 290)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="oklch(0.65 0.28 290)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.05 285 / 30%)" />
                <XAxis dataKey="month" stroke="oklch(0.7 0.02 280)" fontSize={12} />
                <YAxis stroke="oklch(0.7 0.02 280)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.14 0.015 280)",
                    border: "1px solid oklch(0.35 0.08 285 / 40%)",
                    borderRadius: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="oklch(0.65 0.28 290)"
                  fill="url(#g1)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass p-5">
          <h3 className="mb-3 text-sm font-semibold">Latest Clients</h3>
          <ul className="space-y-2">
            {clients
              .slice(-5)
              .reverse()
              .map((c) => (
                <li
                  key={c["Client ID"]}
                  className="flex items-center justify-between rounded-lg bg-muted/30 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{c["Business Name"]}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {c["Client Name"]} · {c["Location"]}
                    </div>
                  </div>
                  <Badge
                    variant={c["Payment Status"] === "Completed" ? "default" : "secondary"}
                    className="shrink-0"
                  >
                    {c["Payment Status"]}
                  </Badge>
                </li>
              ))}
            {!clients.length && (
              <li className="text-sm text-muted-foreground">
                {isLoading ? "Loading…" : "No clients yet."}
              </li>
            )}
          </ul>
        </Card>
        <Card className="glass p-5">
          <h3 className="mb-3 text-sm font-semibold">Latest Activity</h3>
          <ul className="space-y-2">
            {logs
              .slice(-8)
              .reverse()
              .map((l) => (
                <li
                  key={l["Activity ID"]}
                  className="flex items-center justify-between rounded-lg bg-muted/30 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate">{l["Activity"]}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {l["User"]} · {fmtDate(l["Date"])} {l["Time"]}
                    </div>
                  </div>
                </li>
              ))}
            {!logs.length && <li className="text-sm text-muted-foreground">No activity yet.</li>}
          </ul>
        </Card>
        <Card className="glass p-5">
          <h3 className="mb-3 text-sm font-semibold">Latest Payments</h3>
          <ul className="space-y-2">
            {payments
              .slice(-5)
              .reverse()
              .map((p) => (
                <li
                  key={p["Payment ID"]}
                  className="flex items-center justify-between rounded-lg bg-muted/30 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p["Business Name"]}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {fmtDate(p["Payment Date"])}
                    </div>
                  </div>
                  <div className="shrink-0 font-semibold text-emerald-400">
                    {fmtMoney(p["Payment Amount"])}
                  </div>
                </li>
              ))}
            {!payments.length && (
              <li className="text-sm text-muted-foreground">No payments yet.</li>
            )}
          </ul>
        </Card>
        <Card className="glass p-5">
          <h3 className="mb-3 text-sm font-semibold">Latest Expenses & Demos</h3>
          <ul className="space-y-2">
            {expenses
              .slice(-3)
              .reverse()
              .map((e) => (
                <li
                  key={e["Expense ID"]}
                  className="flex items-center justify-between rounded-lg bg-muted/30 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{e["Expense Name"]}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {fmtDate(e["Expense Date"])}
                    </div>
                  </div>
                  <div className="shrink-0 font-semibold text-rose-400">
                    -{fmtMoney(e["Expense Amount"])}
                  </div>
                </li>
              ))}
            {demos
              .slice(-3)
              .reverse()
              .map((d) => (
                <li
                  key={d["Demo ID"]}
                  className="flex items-center justify-between rounded-lg bg-primary/5 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">Demo · {d["Business Name"]}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {fmtDate(d["Added Date"])}
                    </div>
                  </div>
                </li>
              ))}
            {!expenses.length && !demos.length && (
              <li className="text-sm text-muted-foreground">Nothing yet.</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
