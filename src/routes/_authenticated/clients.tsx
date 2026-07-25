import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useErpData, fmtMoney, fmtDate } from "@/lib/use-erp-data";
import { api, downloadCsv, handleApiError, type ClientRow } from "@/lib/sheets-api";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Download, Eye, Pencil, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clients")({
  ssr: false,
  head: () => ({ meta: [{ title: "Clients · Creā Space ERP" }] }),
  component: ClientsPage,
});

const empty = {
  clientName: "", businessName: "", location: "",
  projectPrice: "", advancePayment: "",
  email: "", phone: "", wpUsername: "", wpPassword: "",
};

function ClientsPage() {
  const { data, isLoading } = useErpData();
  const qc = useQueryClient();
  const { user } = useAuth();
  const clients = data?.clients ?? [];
  const payments = data?.payments ?? [];

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [viewing, setViewing] = useState<ClientRow | null>(null);
  const [payFor, setPayFor] = useState<ClientRow | null>(null);
  const [form, setForm] = useState(empty);
  const [payAmt, setPayAmt] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (status !== "all" && c["Payment Status"] !== status) return false;
      if (!q) return true;
      return (
        String(c["Client Name"]).toLowerCase().includes(q) ||
        String(c["Business Name"]).toLowerCase().includes(q) ||
        String(c["Email"]).toLowerCase().includes(q) ||
        String(c["Location"]).toLowerCase().includes(q)
      );
    });
  }, [clients, search, status]);
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);

  function openAdd() { setForm(empty); setEditing(null); setAddOpen(true); }
  function openEdit(c: ClientRow) {
    setEditing(c);
    setForm({
      clientName: c["Client Name"], businessName: c["Business Name"], location: c["Location"],
      projectPrice: String(c["Project Price"] ?? ""), advancePayment: String(c["Advance Payment"] ?? ""),
      email: c["Email"], phone: c["Phone Number"], wpUsername: c["WordPress Username"], wpPassword: c["WordPress Password"],
    });
    setAddOpen(true);
  }

  const remainingPreview = (Number(form.projectPrice) || 0) - (Number(form.advancePayment) || 0);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientName || !form.businessName || !form.projectPrice) {
      toast.error("Fill required fields"); return;
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        projectPrice: Number(form.projectPrice) || 0,
        advancePayment: Number(form.advancePayment) || 0,
      };
      if (editing) {
        await api.updateClient({ ...payload, clientId: editing["Client ID"] }, user?.email || "Admin");
        toast.success("Client updated");
      } else {
        await api.addClient(payload, user?.email || "Admin");
        toast.success("Client added");
      }
      setAddOpen(false);
      qc.invalidateQueries({ queryKey: ["erp-all"] });
    } catch (err) { handleApiError(err); } finally { setBusy(false); }
  }

  async function handleDelete(c: ClientRow) {
    setBusy(true);
    try {
      await api.deleteClient(c["Client ID"], user?.email || "Admin");
      toast.success("Client deleted");
      qc.invalidateQueries({ queryKey: ["erp-all"] });
    } catch (err) { handleApiError(err); } finally { setBusy(false); }
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payFor) return;
    const amt = Number(payAmt) || 0;
    if (amt <= 0) { toast.error("Enter a valid amount"); return; }
    setBusy(true);
    try {
      await api.receivePayment({ clientId: payFor["Client ID"], amount: amt }, user?.email || "Admin");
      toast.success("Payment recorded");
      setPayFor(null); setPayAmt("");
      qc.invalidateQueries({ queryKey: ["erp-all"] });
    } catch (err) { handleApiError(err); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {clients.length} shown</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => downloadCsv("clients.csv", clients as any)} disabled={!clients.length}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAdd} style={{ background: "var(--gradient-primary)" }}>
                <Plus className="mr-2 h-4 w-4" /> Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{editing ? "Edit Client" : "Add Client"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
                <Field label="Client Name *"><Input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} required /></Field>
                <Field label="Business Name *"><Input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} required /></Field>
                <Field label="Location"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
                <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
                <Field label="Phone Number"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
                <Field label="Project Price *"><Input type="number" value={form.projectPrice} onChange={(e) => setForm({ ...form, projectPrice: e.target.value })} required /></Field>
                <Field label="Advance Payment"><Input type="number" value={form.advancePayment} onChange={(e) => setForm({ ...form, advancePayment: e.target.value })} /></Field>
                <Field label="Remaining (auto)"><Input value={fmtMoney(remainingPreview)} readOnly className="bg-muted/40" /></Field>
                <Field label="WordPress Username"><Input value={form.wpUsername} onChange={(e) => setForm({ ...form, wpUsername: e.target.value })} /></Field>
                <Field label="WordPress Password"><Input value={form.wpPassword} onChange={(e) => setForm({ ...form, wpPassword: e.target.value })} /></Field>
                <DialogFooter className="sm:col-span-2">
                  <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={busy} style={{ background: "var(--gradient-primary)" }}>
                    {editing ? "Save Changes" : "Add Client"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="glass p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search clients…" className="pl-9" />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Business</TableHead>
                <TableHead className="hidden md:table-cell">Location</TableHead>
                <TableHead className="text-right">Project</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Paid</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((c) => (
                <TableRow key={c["Client ID"]}>
                  <TableCell className="font-medium">{c["Client Name"]}</TableCell>
                  <TableCell>{c["Business Name"]}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{c["Location"]}</TableCell>
                  <TableCell className="text-right">{fmtMoney(c["Project Price"])}</TableCell>
                  <TableCell className="text-right hidden sm:table-cell text-emerald-400">{fmtMoney(c["Advance Payment"])}</TableCell>
                  <TableCell className="text-right">{fmtMoney(c["Remaining Payment"])}</TableCell>
                  <TableCell>
                    <Badge variant={c["Payment Status"] === "Completed" ? "default" : "secondary"}>{c["Payment Status"]}</Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">{fmtDate(c["Created Date"])}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setViewing(c)} title="View"><Eye className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { setPayFor(c); setPayAmt(""); }} title="Receive Payment" disabled={c["Payment Status"] === "Completed"}><Wallet className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete client?</AlertDialogTitle>
                            <AlertDialogDescription>This will remove {c["Business Name"]} from Google Sheets. This cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => handleDelete(c)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!pageRows.length && (
                <TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">{isLoading ? "Loading…" : "No clients."}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-border/50">
            <div className="text-xs text-muted-foreground">Page {page} of {pages}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Payment Dialog */}
      <Dialog open={!!payFor} onOpenChange={(o) => !o && setPayFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Receive Payment</DialogTitle></DialogHeader>
          {payFor && (
            <form onSubmit={handlePayment} className="space-y-4">
              <div className="rounded-xl bg-muted/30 p-4 space-y-1 text-sm">
                <div className="font-semibold">{payFor["Business Name"]}</div>
                <div className="text-muted-foreground">{payFor["Client Name"]}</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <span>Project: <b>{fmtMoney(payFor["Project Price"])}</b></span>
                  <span>Paid: <b className="text-emerald-400">{fmtMoney(payFor["Advance Payment"])}</b></span>
                  <span>Remaining: <b className="text-amber-400">{fmtMoney(payFor["Remaining Payment"])}</b></span>
                  <span>Status: <b>{payFor["Payment Status"]}</b></span>
                </div>
              </div>
              <div>
                <Label>Payment Amount</Label>
                <Input type="number" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} className="mt-1.5" required />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setPayFor(null)}>Cancel</Button>
                <Button type="submit" disabled={busy} style={{ background: "var(--gradient-primary)" }}>Record Payment</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          {viewing && (
            <>
              <DialogHeader><DialogTitle>{viewing["Business Name"]}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Section title="Business">
                  <Kv k="Client" v={viewing["Client Name"]} />
                  <Kv k="Business" v={viewing["Business Name"]} />
                  <Kv k="Location" v={viewing["Location"]} />
                </Section>
                <Section title="Contact">
                  <Kv k="Email" v={viewing["Email"]} />
                  <Kv k="Phone" v={viewing["Phone Number"]} />
                </Section>
                <Section title="WordPress">
                  <Kv k="Username" v={viewing["WordPress Username"]} />
                  <Kv k="Password" v={viewing["WordPress Password"]} />
                </Section>
                <Section title="Payment">
                  <Kv k="Project Price" v={fmtMoney(viewing["Project Price"])} />
                  <Kv k="Paid" v={fmtMoney(viewing["Advance Payment"])} />
                  <Kv k="Remaining" v={fmtMoney(viewing["Remaining Payment"])} />
                  <Kv k="Status" v={viewing["Payment Status"]} />
                </Section>
                <Section title="Payment History">
                  <div className="max-h-40 overflow-auto space-y-1">
                    {payments.filter((p) => p["Client ID"] === viewing["Client ID"]).map((p) => (
                      <div key={p["Payment ID"]} className="flex justify-between text-xs bg-muted/30 px-3 py-2 rounded">
                        <span>{fmtDate(p["Payment Date"])}</span>
                        <span className="text-emerald-400 font-semibold">{fmtMoney(p["Payment Amount"])}</span>
                        <span className="text-muted-foreground">Rem: {fmtMoney(p["Remaining Payment"])}</span>
                      </div>
                    ))}
                    {!payments.filter((p) => p["Client ID"] === viewing["Client ID"]).length && (
                      <div className="text-xs text-muted-foreground">No payments yet.</div>
                    )}
                  </div>
                </Section>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs">{label}</Label><div className="mt-1.5">{children}</div></div>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      <div className="grid gap-1.5">{children}</div>
    </div>
  );
}
function Kv({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v || "—"}</span>
    </div>
  );
}