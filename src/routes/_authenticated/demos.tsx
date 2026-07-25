import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useErpData, fmtDate } from "@/lib/use-erp-data";
import { api, handleApiError } from "@/lib/sheets-api";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ExternalLink, Copy, Trash2, Search, Plus, Presentation } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/demos")({
  ssr: false,
  head: () => ({ meta: [{ title: "Demos · Creā Space ERP" }] }),
  component: DemosPage,
});

function DemosPage() {
  const { data } = useErpData();
  const qc = useQueryClient();
  const { user } = useAuth();
  const demos = data?.demos ?? [];
  const [search, setSearch] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return demos;
    return demos.filter((d) => String(d["Business Name"]).toLowerCase().includes(q) || String(d["Demo Link"]).toLowerCase().includes(q));
  }, [demos, search]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!businessName || !link) { toast.error("Both fields required"); return; }
    setBusy(true);
    try {
      await api.addDemo({ businessName, link }, user?.email || "Admin");
      toast.success("Demo added");
      setBusinessName(""); setLink("");
      qc.invalidateQueries({ queryKey: ["erp-all"] });
    } catch (err) { handleApiError(err); } finally { setBusy(false); }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteDemo(id, user?.email || "Admin");
      toast.success("Demo deleted");
      qc.invalidateQueries({ queryKey: ["erp-all"] });
    } catch (err) { handleApiError(err); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Demos</h1>
        <p className="text-sm text-muted-foreground">Manage demo links for prospects.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          <Card className="glass p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search demos…" className="pl-9" />
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.slice().reverse().map((d) => (
              <Card key={d["Demo ID"]} className="glass p-5 space-y-3 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-start justify-between gap-2">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: "var(--gradient-primary)" }}>
                    <Presentation className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="text-xs text-muted-foreground">{fmtDate(d["Added Date"])}</div>
                </div>
                <div>
                  <div className="font-semibold truncate">{d["Business Name"]}</div>
                  <a href={d["Demo Link"]} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline break-all line-clamp-1">
                    {d["Demo Link"]}
                  </a>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => window.open(d["Demo Link"], "_blank")}>
                    <ExternalLink className="h-3 w-3 mr-1" /> Open
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(d["Demo Link"]); toast.success("Link copied"); }}>
                    <Copy className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="sm" variant="outline" className="text-destructive"><Trash2 className="h-3 w-3" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete demo?</AlertDialogTitle>
                        <AlertDialogDescription>{d["Business Name"]} will be removed.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => handleDelete(d["Demo ID"])}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            ))}
            {!filtered.length && (
              <Card className="glass p-10 text-center text-muted-foreground sm:col-span-2">
                <Presentation className="mx-auto h-8 w-8 mb-2 opacity-50" />
                No demos found.
              </Card>
            )}
          </div>
        </div>

        <Card className="glass p-5 h-fit lg:sticky lg:top-20">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Add Demo</h3>
          </div>
          <form onSubmit={handleAdd} className="space-y-4">
            <div><Label>Business Name</Label><Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="mt-1.5" required /></div>
            <div><Label>Demo Link</Label><Input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" className="mt-1.5" required /></div>
            <Button type="submit" className="w-full" disabled={busy} style={{ background: "var(--gradient-primary)" }}>Add Demo</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}