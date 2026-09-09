import { CalendarDays, ChartNoAxesCombined, LayoutDashboard, ReceiptText, Tags, Target, Wallet } from "lucide-react";

export const nav = [
  ["overview", "Visão geral", LayoutDashboard],
  ["transactions", "Lançamentos", ReceiptText],
  ["agenda", "Agenda financeira", CalendarDays],
  ["accounts", "Contas e cartões", Wallet],
  ["budgets", "Orçamentos", ChartNoAxesCombined],
  ["goals", "Minhas metas", Target],
  ["categories", "Categorias e tags", Tags],
] as const;
