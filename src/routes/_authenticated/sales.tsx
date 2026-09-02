import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useErpData, fmtMoney, fmtDate } from "@/lib/use-erp-data";
import { api, downloadCsv, handleApiError } from "@/lib/firebase-api";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/erp/stat-card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  IndianRupee,
  Wallet,
  Clock,
  Receipt,
  Percent,
  TrendingUp,
  Plus,
  Trash2,
  Download,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sales")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sales · Creā Space ERP" }] }),
  component: SalesPage,
});

function SalesPage() {
  const { data } = useErpData();
  const qc = useQueryClient();
  const { user } = useAuth();
  const clients = data?.clients ?? [];
  const payments = data?.payments ?? [];
  const expenses = data?.expenses ?? [];

  const [range, setRange] = useState<"month" | "6m" | "year" | "all">("6m");
  const [addOpen, setAddOpen] = useState(false);
  const [expName, setExpName] = useState("");
  const [expDetails, setExpDetails] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const now = new Date();
  const inRange = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return false;
    if (range === "all") return true;
    if (range === "month")
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    if (range === "year") return d.getFullYear() === now.getFullYear();
    const cutoff = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    return d >= cutoff;
  };

  const totals = useMemo(() => {
    const totalRevenue = clients.reduce((s, c) => s + (Number(c["Project Price"]) || 0), 0);
    const remaining = clients.reduce((s, c) => s + (Number(c["Remaining Payment"]) || 0), 0);
    const collected = totalRevenue - remaining;
    const expensesTotal = expenses
      .filter((e) => inRange(e["Expense Date"]))
      .reduce((s, e) => s + (Number(e["Expense Amount"]) || 0), 0);
    const netProfit = collected - expensesTotal;
    const margin = collected > 0 ? (netProfit / collected) * 100 : 0;
    const thisMonth = payments
      .filter((p) => {
        const d = new Date(p["Payment Date"]);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((s, p) => s + (Number(p["Payment Amount"]) || 0), 0);
    const lastMonth = payments
      .filter((p) => {
        const d = new Date(p["Payment Date"]);
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth();
      })
      .reduce((s, p) => s + (Number(p["Payment Amount"]) || 0), 0);
    const growth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;
    return { totalRevenue, remaining, collected, expensesTotal, netProfit, margin, growth };
  }, [clients, payments, expenses, range]);

  const chartData = useMemo(() => {
    const map = new Map<string, { month: string; revenue: number; expenses: number }>();
    const months = range === "month" ? 1 : range === "6m" ? 6 : 12;
    for (let i = months - 1; i >= 0; i--) {
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
  }, [payments, expenses, range]);

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!expName || !expAmount) {
      toast.error("Name and amount required");
      return;
    }
    setBusy(true);
    try {
      await api.addExpense(
        { name: expName, details: expDetails, amount: Number(expAmount) },
        user?.email || "Admin",
      );
      toast.success("Expense added");
      setAddOpen(false);
      setExpName("");
      setExpDetails("");
      setExpAmount("");
      qc.invalidateQueries({ queryKey: ["erp-all"] });
    } catch (err) {
      handleApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteExpense(id: string) {
    try {
      await api.deleteExpense(id, user?.email || "Admin");
      toast.success("Expense deleted");
      qc.invalidateQueries({ queryKey: ["erp-all"] });
    } catch (err) {
      handleApiError(err);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Sales & Analytics</h1>
          <p className="text-sm text-muted-foreground">Business finance overview.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={range} onValueChange={(v: any) => setRange(v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="6m">Last 6 Months</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => downloadCsv("sales-report.csv", clients as any)}
            disabled={!clients.length}
          >
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button style={{ background: "var(--gradient-accent)" }}>
                <Plus className="mr-2 h-4 w-4" /> Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Expense</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <Label>Expense Name</Label>
                  <Input
                    value={expName}
                    onChange={(e) => setExpName(e.target.value)}
                    className="mt-1.5"
                    required
                  />
                </div>
                <div>
                  <Label>Details</Label>
                  <Textarea
                    value={expDetails}
                    onChange={(e) => setExpDetails(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    className="mt-1.5"
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={busy}
                    style={{ background: "var(--gradient-accent)" }}
                  >
                    Add Expense
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
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
        <StatCard
          label="Profit Margin"
          value={totals.margin.toFixed(1) + "%"}
          icon={Percent}
          accent="primary"
        />
        <StatCard
          label="Monthly Growth"
          value={totals.growth.toFixed(1) + "%"}
          icon={TrendingUp}
          accent="primary"
          hint="vs last month"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass p-5">
          <h3 className="mb-3 text-sm font-semibold">Revenue Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
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
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="glass p-5">
          <h3 className="mb-3 text-sm font-semibold">Expenses Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
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
      </div>

      <Card className="glass overflow-hidden">
        <div className="p-5 border-b border-border/40">
          <h3 className="text-sm font-semibold">Client Revenue</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Project</TableHead>
                <TableHead className="text-right">Collected</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c["Client ID"]}>
                  <TableCell className="font-medium">{c["Business Name"]}</TableCell>
                  <TableCell>{c["Client Name"]}</TableCell>
                  <TableCell className="text-right">{fmtMoney(c["Project Price"])}</TableCell>
                  <TableCell className="text-right text-emerald-400">
                    {fmtMoney(
                      (Number(c["Project Price"]) || 0) - (Number(c["Remaining Payment"]) || 0),
                    )}
                  </TableCell>
                  <TableCell className="text-right">{fmtMoney(c["Remaining Payment"])}</TableCell>
                  <TableCell>
                    <Badge variant={c["Payment Status"] === "Completed" ? "default" : "secondary"}>
                      {c["Payment Status"]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {!clients.length && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No clients.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="glass overflow-hidden">
        <div className="p-5 border-b border-border/40 flex justify-between items-center">
          <h3 className="text-sm font-semibold">Expenses</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadCsv("expenses.csv", expenses as any)}
            disabled={!expenses.length}
          >
            <Download className="mr-2 h-3 w-3" /> CSV
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses
                .slice()
                .reverse()
                .map((e) => (
                  <TableRow key={e["Expense ID"]}>
                    <TableCell className="font-medium">{e["Expense Name"]}</TableCell>
                    <TableCell className="text-muted-foreground">{e["Expense Details"]}</TableCell>
                    <TableCell className="text-right text-rose-400">
                      {fmtMoney(e["Expense Amount"])}
                    </TableCell>
                    <TableCell>{fmtDate(e["Expense Date"])}</TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {e["Expense Name"]} will be removed.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground"
                              onClick={() => handleDeleteExpense(e.id!)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              {!expenses.length && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No expenses.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
