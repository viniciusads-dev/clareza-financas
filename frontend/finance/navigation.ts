import { CalendarDays, ChartNoAxesCombined, LayoutDashboard, ReceiptText, Tags, Target, Wallet } from "lucide-react";
import type { View } from "./types";

export const nav = [
  ["overview", "Visão geral", LayoutDashboard],
  ["transactions", "Lançamentos", ReceiptText],
  ["agenda", "Agenda financeira", CalendarDays],
  ["accounts", "Contas e cartões", Wallet],
  ["budgets", "Orçamentos", ChartNoAxesCombined],
  ["goals", "Minhas metas", Target],
  ["categories", "Categorias e tags", Tags],
] as const;

const viewIds = new Set<string>(nav.map(([id]) => id));
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isView(value: string | null): value is View {
  return value !== null && viewIds.has(value);
}

export function parseNavigation(search: string, fallbackMonth: string): { view: View; month: string } {
  const params = new URLSearchParams(search);
  const requestedMonth = params.get("month");
  return {
    view: isView(params.get("view")) ? params.get("view") as View : "overview",
    month: requestedMonth && monthPattern.test(requestedMonth) ? requestedMonth : fallbackMonth,
  };
}

export function navigationSearch(view: View, month: string) {
  const params = new URLSearchParams({ view, month });
  return `?${params.toString()}`;
}
