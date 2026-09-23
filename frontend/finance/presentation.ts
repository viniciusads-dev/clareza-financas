import type { AgendaItem } from "@/frontend/finance/types";
import { addDays, cardInvoiceForTransaction, cardInvoicesFor, categories, colors, today, type CardInvoice, type State, type Transaction } from "@/shared/finance";
export const incomeCategories = ["Salário", "Freelance", "Outros"];
export const expenseCategories = categories.filter(
  (category) => !incomeCategories.includes(category),
);
export const frequencyLabels = {
  weekly: "Toda semana",
  monthly: "Todo mês",
  yearly: "Todo ano",
} as const;
export const monthLabel = (month: string) =>
  new Date(`${month}-15T12:00:00`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
export const shortDate = (date: string) =>
  new Date(`${date}T12:00:00`)
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    .replace(".", "");
export const categoryType = (category: string): "expense" | "income" =>
  incomeCategories.includes(category) ? "income" : "expense";
export const splitIds = (value: string) =>
  value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
export const monthsUntil = (date: string) =>
  Math.max(
    1,
    Math.ceil(
      (new Date(`${date}T12:00:00Z`).getTime() -
        new Date(`${today()}T12:00:00Z`).getTime()) /
      (1000 * 60 * 60 * 24 * 30.4375),
    ),
  );


export function categoryColorFor(state: State, name: string) {
  return state.categories.find((category) => category.name === name)?.color ??
    colors[Math.max(0, categories.indexOf(name)) % colors.length];
}
export function isPendingTransaction(state: State, transaction: Transaction) {
  if (transaction.type !== "expense") return transaction.status === "pending";
  const account = state.accounts.find((item) => item.id === transaction.accountId);
  if (account?.kind !== "credit") return transaction.status === "pending";
  const period = cardInvoiceForTransaction(state, transaction);
  return Boolean(
    period &&
      cardInvoicesFor(state, account).find((invoice) => invoice.id === period.id)
        ?.outstanding,
  );
}
export function categoryTotals(transactions: Transaction[]) {
  return Object.entries(
    transactions
      .filter((transaction) => transaction.type === "expense")
      .reduce<Record<string, number>>((result, transaction) => {
        result[transaction.category] =
          (result[transaction.category] ?? 0) + transaction.amount;
        return result;
      }, {}),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}
export function agendaFor(state: State, currentDate = today()): AgendaItem[] {
  const horizon = addDays(currentDate, 30);
  const invoicesByCard = new Map<string, Map<string, CardInvoice>>();
  for (const account of state.accounts) {
    if (account.kind === "credit")
      invoicesByCard.set(
        account.id,
        new Map<string, CardInvoice>(
          cardInvoicesFor(state, account, currentDate).map((invoice) => [invoice.id, invoice] as const),
        ),
      );
  }
  return [
    ...state.transactions
      .filter(
        (transaction) =>
          transaction.type !== "transfer" &&
          transaction.status === "pending" &&
          transaction.date <= horizon,
      )
      .filter((transaction) => {
        const account = state.accounts.find((item) => item.id === transaction.accountId);
        if (account?.kind !== "credit") return true;
        const period = cardInvoiceForTransaction(state, transaction);
        return Boolean(
          period && invoicesByCard.get(account.id)?.get(period.id)?.outstanding,
        );
      })
      .map((transaction) => {
        const account = state.accounts.find((item) => item.id === transaction.accountId);
        const period = account?.kind === "credit"
          ? cardInvoiceForTransaction(state, transaction)
          : undefined;
        const purchaseDate = transaction.purchaseDate ?? transaction.date;
        const installment = (transaction.installments ?? 1) > 1
          ? `Parcela ${transaction.installment ?? 1}/${transaction.installments}`
          : "Compra no cartão";
        return {
          id: `transaction-${transaction.id}`,
          date: transaction.date,
          title: transaction.title,
          amount: transaction.amount,
          type: transaction.type as "expense" | "income",
          category: transaction.category,
          recurring: Boolean(transaction.recurrenceId),
          accountId: transaction.accountId,
          accountName: account?.name,
          ...(period && account?.kind === "credit"
            ? { context: `${installment} · compra em ${shortDate(purchaseDate)} · fatura vence ${shortDate(period.dueDate)}` }
            : {}),
          source: { kind: "transactions" as const, record: transaction },
        };
      }),
    ...state.recurrences
      .filter(
        (recurrence) => recurrence.active && recurrence.nextDate <= horizon,
      )
      .map((recurrence) => ({
        id: `recurrence-${recurrence.id}`,
        date: recurrence.nextDate,
        title: recurrence.title,
        amount: recurrence.amount,
        type: recurrence.type,
        category: recurrence.category,
        recurring: true,
        accountId: recurrence.accountId,
        accountName: state.accounts.find((item) => item.id === recurrence.accountId)?.name,
        source: { kind: "recurrences" as const, record: recurrence },
      })),
    ...state.incomePlans
      .filter(
        (plan) =>
          plan.automatic &&
          plan.active &&
          Boolean(plan.nextDate) &&
          Boolean(plan.accountId) &&
          plan.nextDate! <= horizon,
      )
      .map((plan) => ({
        id: `income-plan-${plan.id}`,
        date: plan.nextDate!,
        title: plan.title,
        amount: plan.amount,
        type: "income" as const,
        category: "Salário",
        recurring: true,
        accountId: plan.accountId!,
        accountName: state.accounts.find((item) => item.id === plan.accountId)?.name,
        source: { kind: "incomePlans" as const, record: plan },
      })),
  ].sort((a, b) => a.date.localeCompare(b.date));
}
