
import { colors, today, type Recurrence, type State } from "@/shared/finance";

import { expenseCategories } from "@/frontend/finance/presentation";
import type { Editor, FormKind, Entity } from "@/frontend/finance/types";
export function createEditor(real: State, month: string, kind: FormKind, record?: Entity, extra: Record<string, string> = {}): Editor {
  const values: Record<string, string> = {
    name: "",
    title: "",
    amount: "",
    kind: "checking",
    opening: "0",
    color: colors[0],
    limit: "",
    closing: "5",
    due: "12",
    type: "expense",
    category: expenseCategories[0] ?? "Outros",
    subcategory: "",
    tags: "",
    accountId:
      real.accounts.find((account) => account.kind !== "credit")?.id ??
      real.accounts[0]?.id ??
      "",
    toId: "",
    date: today(),
    status: "paid",
    installments: "1",
    invoiceMonth: month,
    month,
    startDate: today(),
    nextDate: today(),
    frequency: "monthly",
    endDate: "",
    active: "true",
    automatic: "false",
    dayOfMonth: "5",
    startMonth: today().slice(0, 7),
    nextPeriod: "",
    businessDayRule: "previous_business_day",
    parentId: "",
    ...extra,
  };
  if (record)
    Object.entries(record).forEach(([key, value]) => {
      if (value !== undefined && value !== null)
        values[key] = Array.isArray(value) ? value.join(",") : String(value);
    });
  for (const key of ["amount", "opening", "limit", "target", "saved"])
    if (record && key in record)
      values[key] = ((record as unknown as Record<string, number>)[key] / 100)
        .toFixed(2)
        .replace(".", ",");
  if (record && "nextDate" in record)
    values.startDate = String((record as Recurrence).startDate);
  return { kind, id: record?.id, values };
}
