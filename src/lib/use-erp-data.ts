import { useQuery } from "@tanstack/react-query";
import { api } from "./sheets-api";

export function useErpData() {
  return useQuery({
    queryKey: ["erp-all"],
    queryFn: () => api.fetchAll(),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function fmtMoney(n: number | string | undefined) {
  const v = Number(n) || 0;
  return "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function fmtDate(iso: string | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}