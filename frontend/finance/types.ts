import type { Account, Budget, Category, Goal, IncomePlan, Recurrence, State, Tag, Transaction } from "@/shared/finance";
import type { createUiSession } from "./ui-session";
export type FormKind =
  | "transactions"
  | "accounts"
  | "budgets"
  | "goals"
  | "recurrences"
  | "incomePlans"
  | "categories"
  | "tags";
export type Entity =
  | Account
  | Transaction
  | Budget
  | Goal
  | Recurrence
  | IncomePlan
  | Category
  | Tag;
export type Editor = { kind: FormKind; id?: string; values: Record<string, string> };
export type AgendaItem = {
  id: string;
  date: string;
  title: string;
  amount: number;
  type: "expense" | "income";
  category: string;
  recurring: boolean;
  accountId: string;
};
export type AlertItem = {
  id: string;
  title: string;
  detail: string;
  tone: "warning" | "positive";
};
export type OnboardingData = {
  accountName: string;
  accountKind: "checking" | "cash";
  opening: string;
  income: string;
  goalName: string;
  goalTarget: string;
  goalDate: string;
};


export type View = "overview" | "transactions" | "agenda" | "accounts" | "budgets" | "goals" | "categories";
export type Deletion = { kind: FormKind; id: string; name: string };
export type UiSession = { quick: string; transactions: { search: string; filter: string; page: number } };
export type PageProps = {
  state: State; month: string; hidden: boolean; focus: boolean; demo: boolean;
  openEditor: (kind: FormKind, record?: Entity, extra?: Record<string, string>) => void;
  askDelete: (kind: FormKind, id: string, name: string) => void;
  setView: (view: View) => void; start: () => void;
  preference: (which: "focus" | "hidden", value: boolean) => void;
  uiSession: ReturnType<typeof createUiSession>; quickVersion: number;
};
