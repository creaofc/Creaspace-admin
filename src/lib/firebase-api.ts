import { toast } from "sonner";
import { db } from "./firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

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
  id?: string; // Firestore document ID
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
  id?: string;
}
export interface ExpenseRow {
  "Expense ID": string;
  "Expense Name": string;
  "Expense Details": string;
  "Expense Amount": number;
  "Expense Date": string;
  id?: string;
}
export interface DemoRow {
  "Demo ID": string;
  "Business Name": string;
  "Demo Link": string;
  "Added Date": string;
  id?: string;
}
export interface LogRow {
  "Activity ID": string;
  Activity: string;
  User: string;
  Date: string;
  Time: string;
  id?: string;
}

export const api = {
  fetchAll: async () => {
    try {
      const clientsSnapshot = await getDocs(collection(db, "clients"));
      const paymentsSnapshot = await getDocs(collection(db, "payments"));
      const expensesSnapshot = await getDocs(collection(db, "expenses"));
      const demosSnapshot = await getDocs(collection(db, "demos"));
      const logsSnapshot = await getDocs(collection(db, "logs"));

      return {
        ok: true as const,
        clients: (clientsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as ClientRow[]).sort((a, b) => new Date(a["Created Date"] || 0).getTime() - new Date(b["Created Date"] || 0).getTime()),
        payments: (paymentsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as PaymentRow[]).sort((a, b) => new Date(a["Payment Date"] || 0).getTime() - new Date(b["Payment Date"] || 0).getTime()),
        expenses: (expensesSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as ExpenseRow[]).sort((a, b) => new Date(a["Expense Date"] || 0).getTime() - new Date(b["Expense Date"] || 0).getTime()),
        demos: (demosSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as DemoRow[]).sort((a, b) => new Date(a["Added Date"] || 0).getTime() - new Date(b["Added Date"] || 0).getTime()),
        logs: (logsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as LogRow[]).sort((a, b) => {
          return (Number(b["Activity ID"]) || 0) - (Number(a["Activity ID"]) || 0);
        }),
      };
    } catch (error: any) {
      console.error("Fetch Error:", error);
      throw new Error(error.message || "Failed to fetch data");
    }
  },

  addClient: async (data: any, user: string) => {
    const projectPrice = Number(data.projectPrice) || 0;
    const advancePayment = Number(data.advancePayment) || 0;
    const remainingPayment = projectPrice - advancePayment;
    const clientIdStr = Date.now().toString();

    const mapped = {
      "Client ID": clientIdStr,
      "Client Name": data.clientName || "",
      "Business Name": data.businessName || "",
      Location: data.location || "",
      "Project Price": projectPrice,
      "Advance Payment": advancePayment,
      "Remaining Payment": remainingPayment,
      Email: data.email || "",
      "Phone Number": data.phone || "",
      "WordPress Username": data.wpUsername || "",
      "WordPress Password": data.wpPassword || "",
      "Payment Status": remainingPayment <= 0 ? "Completed" : "Pending",
      "Created Date": new Date().toISOString(),
      "Updated Date": new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, "clients"), mapped);
    
    if (advancePayment > 0) {
      await addDoc(collection(db, "payments"), {
        "Payment ID": Date.now().toString() + "-adv",
        "Client ID": clientIdStr,
        "Client Name": mapped["Client Name"],
        "Business Name": mapped["Business Name"],
        "Payment Amount": advancePayment,
        "Payment Date": mapped["Created Date"],
      });
    }

    await api.log(`Added client ${mapped["Client Name"]}`, user);
    return { ok: true, id: docRef.id };
  },

  updateClient: async (data: any, user: string) => {
    if (!data.id) throw new Error("Document ID required for update");

    const projectPrice = Number(data.projectPrice) || 0;
    const advancePayment = Number(data.advancePayment) || 0;
    const remainingPayment = projectPrice - advancePayment;

    const mapped = {
      "Client Name": data.clientName || "",
      "Business Name": data.businessName || "",
      Location: data.location || "",
      "Project Price": projectPrice,
      "Advance Payment": advancePayment,
      "Remaining Payment": remainingPayment,
      Email: data.email || "",
      "Phone Number": data.phone || "",
      "WordPress Username": data.wpUsername || "",
      "WordPress Password": data.wpPassword || "",
      "Payment Status": remainingPayment <= 0 ? "Completed" : "Pending",
      "Updated Date": new Date().toISOString(),
    };

    const docRef = doc(db, "clients", data.id);
    await updateDoc(docRef, mapped);
    await api.log(`Updated client ${mapped["Client Name"]}`, user);
    return { ok: true };
  },

  deleteClient: async (docId: string, user: string) => {
    if (!docId) throw new Error("Document ID required for delete");
    await deleteDoc(doc(db, "clients", docId));
    await api.log(`Deleted client`, user);
    return { ok: true };
  },

  receivePayment: async (
    data: {
      clientId: string;
      amount: number;
      id: string;
      "Client Name"?: string;
      "Business Name"?: string;
      "Advance Payment"?: number;
      "Remaining Payment"?: number;
      "Payment Status"?: string;
      "Payment Date"?: string;
    },
    user: string,
  ) => {
    // Add to payments collection
    await addDoc(collection(db, "payments"), {
      "Payment ID": Date.now().toString(),
      "Client ID": data.clientId,
      "Client Name": data["Client Name"] || "",
      "Business Name": data["Business Name"] || "",
      "Payment Amount": data.amount,
      "Payment Date": data["Payment Date"] || new Date().toISOString(),
    });

    // Also update client remaining payment
    if (data.id) {
      const docRef = doc(db, "clients", data.id);
      const oldAdvance = Number(data["Advance Payment"]) || 0;
      const oldRemaining = Number(data["Remaining Payment"]) || 0;
      const newAdvance = oldAdvance + data.amount;
      const newRemaining = Math.max(0, oldRemaining - data.amount);

      await updateDoc(docRef, {
        "Advance Payment": newAdvance,
        "Remaining Payment": newRemaining,
        "Payment Status": newRemaining <= 0 ? "Completed" : "Pending",
        "Updated Date": new Date().toISOString(),
      });
    }

    await api.log(
      `Received payment of ${data.amount} for client ${data["Client Name"] || data.clientId}`,
      user,
    );
    return { ok: true };
  },

  addExpense: async (data: any, user: string) => {
    const mapped = {
      "Expense ID": Date.now().toString(),
      "Expense Name": data.name || "",
      "Expense Details": data.details || "",
      "Expense Amount": Number(data.amount) || 0,
      "Expense Date": new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, "expenses"), mapped);
    await api.log(`Added expense ${mapped["Expense Name"]}`, user);
    return { ok: true, id: docRef.id };
  },

  deleteExpense: async (docId: string, user: string) => {
    if (!docId) throw new Error("Document ID required for delete");
    await deleteDoc(doc(db, "expenses", docId));
    await api.log(`Deleted expense`, user);
    return { ok: true };
  },

  addDemo: async (data: any, user: string) => {
    const mapped = {
      "Demo ID": Date.now().toString(),
      "Business Name": data.businessName || "",
      "Demo Link": data.link || "",
      "Added Date": new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, "demos"), mapped);
    await api.log(`Added demo for ${mapped["Business Name"]}`, user);
    return { ok: true, id: docRef.id };
  },

  deleteDemo: async (docId: string, user: string) => {
    if (!docId) throw new Error("Document ID required for delete");
    await deleteDoc(doc(db, "demos", docId));
    await api.log(`Deleted demo`, user);
    return { ok: true };
  },

  log: async (activity: string, user: string) => {
    const now = new Date();
    await addDoc(collection(db, "logs"), {
      "Activity ID": Date.now().toString(),
      Activity: activity,
      User: user,
      Date: now.toLocaleDateString("en-IN"),
      Time: now.toLocaleTimeString("en-IN"),
    });
  },
};

export function handleApiError(err: unknown) {
  const msg = err instanceof Error ? err.message : "Something went wrong";
  toast.error(msg);
  return msg;
}

export function toCsv(rows: Record<string, any>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]).filter((k) => k !== "id");
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
