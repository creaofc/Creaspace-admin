import { createFileRoute } from "@tanstack/react-router";
import { useErpData, fmtDate } from "@/lib/use-erp-data";
import { useAuth } from "@/lib/auth-context";
import { api, type TaskRow } from "@/lib/firebase-api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, CheckSquare, Clock, Calendar, AlertCircle, User, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/tracker")({
  ssr: false,
  head: () => ({ meta: [{ title: "Daily Tracker · Creā Space ERP" }] }),
  component: TrackerPage,
});

const EMPLOYEES = [
  "varunbhalerao028@gmail.com",
  "atishgadade16@gmail.com",
  "dhagesachin23@gmail.com"
];

function TrackerPage() {
  const { user } = useAuth();
  const { data, isLoading } = useErpData();
  const tasks = data?.tasks || [];
  
  const isAdmin = user?.role === "admin";
  const myTasks = isAdmin ? tasks : tasks.filter(t => t.assignedTo === user?.email);

  const [filter, setFilter] = useState<"All" | "Complete" | "Pending">("All");

  const filteredTasks = myTasks.filter(task => {
    if (filter === "Complete") return task.status === "Completed";
    if (filter === "Pending") return task.status === "Pending" || task.status === "In Progress";
    return true; // All
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Daily Tracker</h1>
          <p className="text-sm text-muted-foreground">Manage tasks, progress, and assignments.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          {!isAdmin && (
            <div className="flex bg-secondary/50 p-1 rounded-lg">
              {(["All", "Pending", "Complete"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors whitespace-nowrap ${filter === f ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
          {isAdmin && <CreateTaskModal />}
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground animate-pulse flex gap-2 items-center"><Clock className="w-4 h-4" /> Loading tasks...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.length === 0 ? (
            <div className="text-muted-foreground col-span-full py-8 text-center border-2 border-dashed rounded-xl border-border/50 bg-muted/10">No {filter !== "All" ? filter.toLowerCase() : ""} tasks found.</div>
          ) : (
            filteredTasks.map(task => <TaskCard key={task.id} task={task} isAdmin={isAdmin} />)
          )}
        </div>
      )}
    </div>
  );
}

function CreateTaskModal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checklistText, setChecklistText] = useState("");

  // Auto fill start date with current local datetime
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const currentDateTime = now.toISOString().slice(0, 16);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const checklist = checklistText.split("\n").filter(Boolean).map(item => ({ item: item.trim(), completed: false }));

    const data = {
      title: fd.get("title"),
      project: fd.get("project"),
      assignedTo: fd.get("assignedTo"),
      priority: fd.get("priority"),
      startDate: fd.get("startDate"),
      deadline: fd.get("deadline"),
      description: fd.get("description"),
      checklist
    };

    try {
      await api.addTask(data, user!.email);
      toast.success("Task assigned successfully");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["erp-all"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button style={{ background: "var(--gradient-primary)" }} className="shadow-lg shadow-primary/20"><Plus className="mr-2 h-4 w-4" /> Create Task</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-0 border-0 bg-background/95 backdrop-blur-md">
        <div className="p-6 bg-gradient-to-br from-primary/10 via-background to-background">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <span className="bg-primary/20 p-2 rounded-full"><Plus className="w-5 h-5 text-primary" /></span>
              Assign New Task
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4 bg-card/50 p-4 rounded-xl border border-border/50">
              <div className="grid gap-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Task Title</Label>
                <Input name="title" required placeholder="e.g. Design Homepage" className="bg-background/50 border-primary/20 focus-visible:ring-primary/30" />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project Name</Label>
                <Input name="project" required placeholder="e.g. NextCollege" className="bg-background/50 border-primary/20 focus-visible:ring-primary/30" />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assign To</Label>
                <select name="assignedTo" required defaultValue="" className="flex h-10 w-full rounded-md border border-primary/20 bg-background/50 px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                  <option value="" disabled>Select employee...</option>
                  {EMPLOYEES.map(e => <option key={e} value={e} className="bg-background">{e}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-card/50 p-4 rounded-xl border border-border/50">
              <div className="grid gap-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start Date & Time</Label>
                <Input name="startDate" type="datetime-local" defaultValue={currentDateTime} required className="bg-background/50 border-primary/20 focus-visible:ring-primary/30" />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deadline Date</Label>
                <Input name="deadline" type="date" required className="bg-background/50 border-primary/20 focus-visible:ring-primary/30" />
              </div>
            </div>

            <div className="space-y-4 bg-card/50 p-4 rounded-xl border border-border/50">
              <div className="grid gap-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority</Label>
                <select name="priority" defaultValue="Medium" className="flex h-10 w-full rounded-md border border-primary/20 bg-background/50 px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                  <option value="High" className="bg-background text-red-500 font-medium">High</option>
                  <option value="Medium" className="bg-background text-yellow-500 font-medium">Medium</option>
                  <option value="Low" className="bg-background text-emerald-500 font-medium">Low</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Task Description</Label>
                <Textarea name="description" required placeholder="Details about the task..." className="bg-background/50 border-primary/20 focus-visible:ring-primary/30 resize-none h-24" />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Checklist <span className="normal-case font-normal">(One per line)</span></Label>
                <Textarea 
                  value={checklistText} 
                  onChange={e => setChecklistText(e.target.value)} 
                  placeholder="Hero section&#10;About section&#10;Mobile responsive" 
                  className="bg-background/50 border-primary/20 focus-visible:ring-primary/30 resize-none h-24"
                />
              </div>
            </div>
            
            <Button type="submit" disabled={submitting} className="w-full h-11 text-md shadow-lg shadow-primary/20 mt-4" style={{ background: "var(--gradient-primary)" }}>
              {submitting ? "Assigning Task..." : "Assign Task"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TaskCard({ task, isAdmin }: { task: TaskRow; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending": return "destructive";
      case "In Progress": return "warning";
      case "Completed": return "default";
      case "Submitted": return "secondary";
      default: return "outline";
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await api.deleteTask(task.id!, user!.email);
      toast.success("Task deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["erp-all"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete task");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="glass p-5 cursor-pointer hover:border-primary/50 transition-colors animate-in fade-in zoom-in-95">
          <div className="flex justify-between items-start mb-3">
            <Badge variant={getStatusColor(task.status) as any}>{task.status}</Badge>
            {task.priority === "High" && <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="w-3 h-3"/> High</Badge>}
          </div>
          <h3 className="font-semibold text-lg line-clamp-1 mb-1">{task.title}</h3>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-1">{task.project}</p>
          
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> Deadline: {fmtDate(task.deadline)}</div>
            {isAdmin && <div className="flex items-center gap-2"><User className="w-4 h-4" /> {task.assignedTo}</div>}
          </div>
          
          {task.checklist && task.checklist.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex justify-between items-center text-xs mb-2">
                <span>Progress</span>
                <span>{task.checklist.filter(c => c.completed).length} / {task.checklist.length}</span>
              </div>
              <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all" 
                  style={{ width: `${(task.checklist.filter(c => c.completed).length / task.checklist.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </Card>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-xl">{task.title}</DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusColor(task.status) as any}>{task.status}</Badge>
              {isAdmin && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Project: {task.project} · Assigned to: {task.assignedTo}</p>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div>
            <h4 className="font-medium mb-2 text-sm flex items-center gap-2"><Calendar className="w-4 h-4"/> Description</h4>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-md">
              {task.description}
            </div>
          </div>
          
          <TaskUpdater task={task} isAdmin={isAdmin} />

          {task.updates && task.updates.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 text-sm">Daily Updates</h4>
              <div className="space-y-3">
                {task.updates.slice().reverse().map((u, i) => (
                  <div key={i} className="text-sm bg-muted/20 p-3 rounded-md border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1 flex justify-between">
                      <span>{u.user}</span>
                      <span>{fmtDate(u.date)}</span>
                    </div>
                    <div>{u.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {task.history && task.history.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 text-sm">Activity History</h4>
              <div className="space-y-3 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                {task.history.slice().reverse().map((h, i) => (
                  <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-4 h-4 rounded-full border border-primary bg-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow" />
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-lg border border-border/50 bg-card shadow-sm text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-primary text-xs">{h.user}</span>
                        <time className="text-xs text-muted-foreground">{new Date(h.date).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute:"2-digit" })}</time>
                      </div>
                      <div className="text-muted-foreground">{h.action}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TaskUpdater({ task, isAdmin }: { task: TaskRow; isAdmin: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [checklist, setChecklist] = useState(task.checklist || []);
  const [updateText, setUpdateText] = useState("");
  const [status, setStatus] = useState(task.status);
  const [submitting, setSubmitting] = useState(false);

  const toggleCheck = (idx: number) => {
    const newChecklist = [...checklist];
    newChecklist[idx].completed = !newChecklist[idx].completed;
    setChecklist(newChecklist);
    // Auto status
    if (newChecklist.every(c => c.completed) && status === "Pending") setStatus("In Progress");
  };

  const submitUpdate = async () => {
    setSubmitting(true);
    try {
      await api.updateTaskProgress(task.id!, {
        status,
        checklist,
        updateText,
        existingUpdates: task.updates || [],
        existingHistory: task.history || []
      }, user!.email);
      toast.success("Task updated");
      setUpdateText("");
      queryClient.invalidateQueries({ queryKey: ["erp-all"] });
    } catch (err: any) {
      toast.error("Failed to update task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 space-y-4">
      {checklist.length > 0 && (
        <div>
          <h4 className="font-medium mb-3 text-sm flex items-center gap-2"><CheckSquare className="w-4 h-4"/> Checklist</h4>
          <div className="space-y-2">
            {checklist.map((item, idx) => (
              <div key={idx} className="flex items-start space-x-2">
                <Checkbox 
                  id={`chk-${idx}`} 
                  checked={item.completed} 
                  onCheckedChange={() => toggleCheck(idx)}
                  disabled={isAdmin && task.assignedTo !== user?.email} // Admins can't check off unless assigned to them
                />
                <label 
                  htmlFor={`chk-${idx}`} 
                  className={`text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${item.completed ? 'line-through text-muted-foreground' : ''}`}
                >
                  {item.item}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!isAdmin || task.assignedTo === user?.email || isAdmin) && (
        <div className="space-y-3 pt-3 border-t border-border/50 mt-4">
          <div className="grid gap-2">
            <Label>Update Status</Label>
            <select 
              value={status} 
              onChange={e => setStatus(e.target.value)}
              className="flex h-9 w-full sm:w-48 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="Pending" className="bg-background">Pending</option>
              <option value="In Progress" className="bg-background">In Progress</option>
              <option value="Completed" className="bg-background">Completed</option>
              <option value="Submitted" className="bg-background">Submitted to Admin</option>
            </select>
          </div>
          
          <div className="grid gap-2">
            <Label>Daily Update Description</Label>
            <Textarea 
              value={updateText} 
              onChange={e => setUpdateText(e.target.value)} 
              placeholder="What did you work on today?" 
              rows={2}
            />
          </div>
          
          <Button onClick={submitUpdate} disabled={submitting} className="w-full sm:w-auto">
            {submitting ? "Saving..." : "Submit Progress"}
          </Button>
        </div>
      )}
    </div>
  );
}
