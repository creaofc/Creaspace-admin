import { toast } from "sonner";

const URL_KEY = "crea_apps_script_url";

export function getAppsScriptUrl(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(URL_KEY);
}
export function setAppsScriptUrl(url: string) {
  localStorage.setItem(URL_KEY, url.trim());
}
export function clearAppsScriptUrl() {
  localStorage.removeItem(URL_KEY);
}

async function request<T = any>(params: Record<string, string> = {}, body?: any): Promise<T> {
  const base = getAppsScriptUrl();
  if (!base) throw new Error("Google Apps Script URL is not configured");
  const url = new URL(base);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const init: RequestInit = body
    ? { method: "POST", body: JSON.stringify(body), redirect: "follow" }
    : { method: "GET", redirect: "follow" };
  const res = await fetch(url.toString(), init);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const json = await res.json();
  if (json && json.ok === false) throw new Error(json.error || "Request failed");
  return json as T;
}

export interface ClientRow {
  "Client ID": string;
  "Client Name": string;
  "Business Name": string;
  Location: string;
  "Project Price": number;
  "Advance Payment": number;
  "Remaining Payment": number;
  Email: string;
  "Phone Number": string;
  "WordPress Username": string;
  "WordPress Password": string;
  "Payment Status": string;
  "Created Date": string;
  "Updated Date": string;
}
export interface PaymentRow {
  "Payment ID": string;
  "Client ID": string;
  "Client Name": string;
  "Business Name": string;
  "Payment Amount": number;
  "Remaining Payment": number;
  "Payment Status": string;
  "Payment Date": string;
}
export interface ExpenseRow {
  "Expense ID": string;
  "Expense Name": string;
  "Expense Details": string;
  "Expense Amount": number;
  "Expense Date": string;
}
export interface DemoRow {
  "Demo ID": string;
  "Business Name": string;
  "Demo Link": string;
  "Added Date": string;
}
export interface LogRow {
  "Activity ID": string;
  Activity: string;
  User: string;
  Date: string;
  Time: string;
}

export const api = {
  ping: () => request({ action: "ping" }),
  login: (email: string, password: string) =>
    request<{ ok: boolean; user?: { email: string; role: string }; error?: string }>({
      action: "login",
      email,
      password,
    }),
  fetchAll: () =>
    request<{
      ok: true;
      clients: ClientRow[];
      payments: PaymentRow[];
      expenses: ExpenseRow[];
      demos: DemoRow[];
      logs: LogRow[];
    }>({ action: "all" }),
  addClient: (data: any, user: string) => request({}, { action: "addClient", data, user }),
  updateClient: (data: any, user: string) => request({}, { action: "updateClient", data, user }),
  deleteClient: (clientId: string, user: string) =>
    request({}, { action: "deleteClient", clientId, user }),
  receivePayment: (data: { clientId: string; amount: number }, user: string) =>
    request({}, { action: "receivePayment", data, user }),
  addExpense: (data: any, user: string) => request({}, { action: "addExpense", data, user }),
  deleteExpense: (expenseId: string, user: string) =>
    request({}, { action: "deleteExpense", expenseId, user }),
  addDemo: (data: any, user: string) => request({}, { action: "addDemo", data, user }),
  deleteDemo: (demoId: string, user: string) => request({}, { action: "deleteDemo", demoId, user }),
  log: (activity: string, user: string) => request({}, { action: "log", activity, user }),
};

export function handleApiError(err: unknown) {
  const msg = err instanceof Error ? err.message : "Something went wrong";
  toast.error(msg);
  return msg;
}

export function toCsv(rows: Record<string, any>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join(
    "\n",
  );
}

export function downloadCsv(filename: string, rows: Record<string, any>[]) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
