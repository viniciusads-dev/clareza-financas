import { agendaFor, categoryTotals } from "@/frontend/finance/presentation";
import { ALL_ACCOUNTS, type AlertItem } from "@/frontend/finance/types";
import {
  addDays,
  addMonths,
  balances,
  brl,
  invoiceBalance,
  monthStats,
  nextRecurrenceDate,
  today,
  type State,
} from "@/shared/finance";
import { CircleAlert, Lightbulb, Repeat, TrendingUp } from "lucide-react";

export function transactionsForAccount(state: State, accountId: string) {
  if (accountId === ALL_ACCOUNTS) return state.transactions;
  return state.transactions.filter(
    (transaction) =>
      transaction.accountId === accountId ||
      (transaction.type === "transfer" && transaction.toId === accountId),
  );
}

function stateForAccount(state: State, accountId: string, exists: boolean): State {
  if (!exists || accountId === ALL_ACCOUNTS) return state;
  return {
    ...state,
    transactions: transactionsForAccount(state, accountId),
    recurrences: state.recurrences.filter(
      (recurrence) => recurrence.accountId === accountId,
    ),
    incomePlans: state.incomePlans.filter(
      (plan) => plan.accountId === accountId,
    ),
  };
}

type ProjectionDirection = "income" | "expense";
type ProjectionSource =
  | "transaction"
  | "transfer"
  | "recurrence"
  | "income-plan"
  | "card-invoice";

type ProjectionItem = {
  id: string;
  date: string;
  title: string;
  amount: number;
  direction: ProjectionDirection;
  source: ProjectionSource;
  accountName?: string;
  overdue?: boolean;
  originalDate?: string;
};

function invoiceDueDate(month: string, dueDay: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return `${month}-${String(Math.min(dueDay, lastDay)).padStart(2, "0")}`;
}

function invoiceOutstandingAsOf(
  state: State,
  accountId: string,
  month: string,
  asOf: string,
) {
  const purchases = state.transactions
    .filter(
      (transaction) =>
        transaction.accountId === accountId &&
        transaction.type === "expense" &&
        transaction.date.startsWith(month),
    )
    .reduce((total, transaction) => total + transaction.amount, 0);
  const settledPayments = state.transactions
    .filter(
      (transaction) =>
        transaction.toId === accountId &&
        transaction.type === "transfer" &&
        transaction.status === "paid" &&
        transaction.date <= asOf &&
        (transaction.invoiceMonth ?? transaction.date.slice(0, 7)) === month,
    )
    .reduce((total, transaction) => total + transaction.amount, 0);
  return Math.max(0, purchases - settledPayments);
}

function cashFlowProjection(
  state: State,
  startBalance: number,
  accountId: string,
  asOf: string,
) {
  const selectedAccount = state.accounts.find(
    (account) => account.id === accountId,
  );
  if (selectedAccount?.kind === "credit") return null;

  const isConsolidated = !selectedAccount || accountId === ALL_ACCOUNTS;
  const scopedState = stateForAccount(state, accountId, Boolean(selectedAccount));
  const endDate = addDays(asOf, 30);
  const accountById = new Map(state.accounts.map((account) => [account.id, account]));
  const items: ProjectionItem[] = [];
  const scheduledCardPayments = new Map<string, number>();
  for (const transaction of state.transactions) {
    if (
      transaction.type !== "transfer" ||
      transaction.status !== "paid" ||
      !transaction.toId ||
      transaction.date <= asOf ||
      transaction.date > endDate ||
      accountById.get(transaction.toId)?.kind !== "credit"
    )
      continue;
    const month = transaction.invoiceMonth ?? transaction.date.slice(0, 7);
    const key = `${transaction.toId}:${month}`;
    scheduledCardPayments.set(
      key,
      (scheduledCardPayments.get(key) ?? 0) + transaction.amount,
    );
  }

  const addItem = (item: ProjectionItem) => {
    if (item.date < asOf || item.date > endDate || item.amount <= 0) return;
    items.push(item);
  };

  for (const transaction of scopedState.transactions) {
    const sourceAccount = accountById.get(transaction.accountId);

    if (transaction.type === "transfer") {
      const destination = transaction.toId
        ? accountById.get(transaction.toId)
        : undefined;
      if (
        transaction.status !== "paid" ||
        transaction.date <= asOf ||
        transaction.date > endDate ||
        !sourceAccount ||
        !destination
      )
        continue;

      if (isConsolidated) {
        // Transfers between cash accounts change where money sits, not the consolidated balance.
        if (sourceAccount.kind !== "credit" && destination.kind === "credit")
          addItem({
            id: `transfer-${transaction.id}`,
            date: transaction.date,
            title: transaction.title,
            amount: transaction.amount,
            direction: "expense",
            source: "transfer",
            accountName: sourceAccount.name,
          });
        continue;
      }

      if (transaction.accountId === selectedAccount.id) {
        addItem({
          id: `transfer-${transaction.id}`,
          date: transaction.date,
          title: transaction.title,
          amount: transaction.amount,
          direction: "expense",
          source: "transfer",
          accountName: sourceAccount.name,
        });
      } else if (transaction.toId === selectedAccount.id) {
        addItem({
          id: `transfer-${transaction.id}`,
          date: transaction.date,
          title: transaction.title,
          amount: transaction.amount,
          direction: "income",
          source: "transfer",
          accountName: sourceAccount.name,
        });
      }
      continue;
    }

    if (!sourceAccount || sourceAccount.kind === "credit") continue;

    if (transaction.date < asOf) {
      if (transaction.type === "expense" && transaction.status === "pending")
        addItem({
          id: `transaction-${transaction.id}`,
          date: asOf,
          originalDate: transaction.date,
          title: transaction.title,
          amount: transaction.amount,
          direction: "expense",
          source: "transaction",
          accountName: sourceAccount.name,
          overdue: true,
        });
      continue;
    }

    // Paid movements dated today are already represented in the real balance.
    if (transaction.date === asOf && transaction.status === "paid") continue;

    addItem({
      id: `transaction-${transaction.id}`,
      date: transaction.date,
      title: transaction.title,
      amount: transaction.amount,
      direction: transaction.type,
      source: "transaction",
      accountName: sourceAccount.name,
    });
  }

  for (const recurrence of scopedState.recurrences) {
    const account = accountById.get(recurrence.accountId);
    if (!recurrence.active || !account || account.kind === "credit") continue;

    let occurrence = recurrence.nextDate;
    let steps = 0;
    while (occurrence < asOf && steps < 1000) {
      occurrence = nextRecurrenceDate(occurrence, recurrence.frequency);
      steps += 1;
    }
    while (occurrence <= endDate && steps < 1000) {
      const alreadyMaterialized = scopedState.transactions.some(
        (transaction) =>
          transaction.recurrenceId === recurrence.id &&
          transaction.date === occurrence,
      );
      if (!alreadyMaterialized)
        addItem({
          id: `recurrence-${recurrence.id}-${occurrence}`,
          date: occurrence,
          title: recurrence.title,
          amount: recurrence.amount,
          direction: recurrence.type,
          source: "recurrence",
          accountName: account.name,
        });
      occurrence = nextRecurrenceDate(occurrence, recurrence.frequency);
      steps += 1;
    }
  }

  for (const plan of scopedState.incomePlans) {
    if (
      !plan.automatic ||
      !plan.active ||
      !plan.nextDate ||
      !plan.accountId ||
      plan.nextDate < asOf ||
      plan.nextDate > endDate
    )
      continue;
    const account = accountById.get(plan.accountId);
    if (!account || account.kind === "credit") continue;
    const alreadyMaterialized = scopedState.transactions.some(
      (transaction) =>
        transaction.incomePlanId === plan.id &&
        transaction.date === plan.nextDate,
    );
    if (!alreadyMaterialized)
      addItem({
        id: `income-plan-${plan.id}`,
        date: plan.nextDate,
        title: plan.title,
        amount: plan.amount,
        direction: "income",
        source: "income-plan",
        accountName: account.name,
      });
  }

  if (isConsolidated) {
    let period = asOf.slice(0, 7);
    const lastPeriod = endDate.slice(0, 7);
    while (period <= lastPeriod) {
      for (const card of state.accounts.filter((account) => account.kind === "credit")) {
        const outstanding = invoiceOutstandingAsOf(state, card.id, period, asOf);
        const scheduledPayment = scheduledCardPayments.get(`${card.id}:${period}`) ?? 0;
        const dueCommitment = Math.max(0, outstanding - scheduledPayment);
        if (!dueCommitment) continue;
        const dueDate = invoiceDueDate(period, card.due);
        const overdue = dueDate < asOf;
        addItem({
          id: `card-invoice-${card.id}-${period}`,
          date: overdue ? asOf : dueDate,
          originalDate: dueDate,
          title: `${card.name} · fatura ${period}`,
          amount: dueCommitment,
          direction: "expense",
          source: "card-invoice",
          accountName: card.name,
          ...(overdue ? { overdue: true } : {}),
        });
      }
      period = addMonths(`${period}-01`, 1).slice(0, 7);
    }
  }

  items.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const byDate = new Map<string, ProjectionItem[]>();
  for (const item of items) {
    const dayItems = byDate.get(item.date) ?? [];
    dayItems.push(item);
    byDate.set(item.date, dayItems);
  }

  let balance = startBalance;
  let income = 0;
  let expense = 0;
  const days = [...byDate.entries()].map(([date, dayItems]) => {
    const incoming = dayItems
      .filter((item) => item.direction === "income")
      .reduce((sum, item) => sum + item.amount, 0);
    const outgoing = dayItems
      .filter((item) => item.direction === "expense")
      .reduce((sum, item) => sum + item.amount, 0);
    income += incoming;
    expense += outgoing;
    balance += incoming - outgoing;
    return { date, items: dayItems, income: incoming, expense: outgoing, balance };
  });

  return {
    asOf,
    startBalance,
    endDate,
    income,
    expense,
    projectedBalance: balance,
    days,
  };
}

export function overviewModel(
  state: State,
  month: string,
  accountId = ALL_ACCOUNTS,
  asOf = today(),
) {
  const selectedAccount = state.accounts.find(
    (account) => account.id === accountId,
  );
  const scopedState = stateForAccount(
    state,
    accountId,
    Boolean(selectedAccount),
  );
  const stats = monthStats(scopedState, month);
  const previousStats = monthStats(
    scopedState,
    addMonths(`${month}-01`, -1).slice(0, 7),
  );
  const currentDate = asOf;
  const balancesByAccount = balances(state, currentDate);

  let cash = 0;
  let cardDebt = 0;
  let cashPending = 0;
  if (selectedAccount) {
    const accountBalance = balancesByAccount[selectedAccount.id] ?? 0;
    if (selectedAccount.kind === "credit") {
      cardDebt = Math.max(0, -accountBalance);
    } else {
      cash = accountBalance;
      cashPending = scopedState.transactions
        .filter(
          (transaction) =>
            transaction.type === "expense" &&
            transaction.status === "pending",
        )
        .reduce((sum, transaction) => sum + transaction.amount, 0);
    }
  } else {
    cash = state.accounts
      .filter((account) => account.kind !== "credit")
      .reduce((sum, account) => sum + (balancesByAccount[account.id] ?? 0), 0);
    cardDebt = state.accounts
      .filter((account) => account.kind === "credit")
      .reduce(
        (sum, account) =>
          sum + Math.max(0, -(balancesByAccount[account.id] ?? 0)),
        0,
      );
    cashPending = state.transactions
      .filter(
        (transaction) =>
          transaction.type === "expense" &&
          transaction.status === "pending" &&
          state.accounts.find((account) => account.id === transaction.accountId)
            ?.kind !== "credit",
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  }

  const selectedInvoice =
    selectedAccount?.kind === "credit"
      ? invoiceBalance(state, selectedAccount.id, month)
      : 0;
  const cardLimitAvailable = selectedAccount?.kind === "credit"
    ? selectedAccount.limit - cardDebt
    : null;
  const categoryData = categoryTotals(stats.tx);
  const previousCategoryData = categoryTotals(previousStats.tx);
  const monthlyBudgets = state.budgets.filter(
    (budget) => budget.month === month,
  );
  const agendaItems = agendaFor(scopedState, currentDate);
  const projection = cashFlowProjection(
    state,
    cash,
    accountId,
    currentDate,
  );

  const alerts: AlertItem[] = (() => {
    const items: AlertItem[] = [];
    const overdue = scopedState.transactions.filter(
      (transaction) =>
        transaction.type === "expense" &&
        transaction.status === "pending" &&
        transaction.date < currentDate,
    );
    if (overdue.length)
      items.push({
        id: "overdue",
        title: `${overdue.length} compromisso${overdue.length > 1 ? "s" : ""} vencido${overdue.length > 1 ? "s" : ""}`,
        detail: "Revise a agenda para evitar juros ou esquecimentos.",
        tone: "warning",
      });
    const near = agendaItems.filter(
      (item) =>
        item.date >= currentDate && item.date <= addDays(currentDate, 7),
    );
    if (near.length)
      items.push({
        id: "near",
        title: `${near.length} compromisso${near.length > 1 ? "s" : ""} nos próximos 7 dias`,
        detail: "Você já pode se preparar para as próximas saídas.",
        tone: "positive",
      });
    monthlyBudgets
      .filter(
        (budget) =>
          (categoryData.find((category) => category.name === budget.category)
            ?.value ?? 0) /
            budget.amount >=
          0.8,
      )
      .slice(0, 2)
      .forEach((budget) => {
        const spent =
          categoryData.find((category) => category.name === budget.category)
            ?.value ?? 0;
        items.push({
          id: `budget-${budget.id}`,
          title: `${budget.category} chegou a ${Math.round((spent / budget.amount) * 100)}%`,
          detail:
            spent > budget.amount
              ? "O limite já foi ultrapassado neste mês."
              : "Ainda dá para ajustar o ritmo dos próximos dias.",
          tone: spent > budget.amount ? "warning" : "positive",
        });
      });
    const overdueGoal = state.goals.find(
      (goal) => goal.date < currentDate && goal.saved < goal.target,
    );
    if (overdueGoal)
      items.push({
        id: "goal",
        title: `${overdueGoal.name} precisa de um novo plano`,
        detail:
          "Atualize o prazo ou o valor guardado para continuar acompanhando.",
        tone: "warning",
      });
    return items.slice(0, 5);
  })();

  const insights = (() => {
    const result: {
      id: string;
      title: string;
      detail: string;
      icon: typeof TrendingUp;
    }[] = [];
    const top = categoryData[0];
    if (top) {
      const before =
        previousCategoryData.find((category) => category.name === top.name)
          ?.value ?? 0;
      result.push({
        id: "top",
        title: `${top.name} é seu maior grupo de gastos`,
        detail: `${brl(top.value)} no mês. ${before ? `${Math.round(((top.value - before) / before) * 100)}% em relação ao mês anterior.` : "Continue registrando para comparar sua evolução."}`,
        icon: TrendingUp,
      });
    }
    const overBudget = monthlyBudgets.find(
      (budget) =>
        (categoryData.find((category) => category.name === budget.category)
          ?.value ?? 0) > budget.amount,
    );
    if (overBudget)
      result.push({
        id: "budget",
        title: `${overBudget.category} pede atenção`,
        detail: `Você passou ${brl((categoryData.find((category) => category.name === overBudget.category)?.value ?? 0) - overBudget.amount)} do limite planejado.`,
        icon: CircleAlert,
      });
    const recurringTotal = scopedState.recurrences
      .filter(
        (recurrence) =>
          recurrence.active &&
          recurrence.frequency === "monthly" &&
          recurrence.type === "expense",
      )
      .reduce((sum, recurrence) => sum + recurrence.amount, 0);
    if (recurringTotal)
      result.push({
        id: "recurring",
        title: "Seus compromissos fixos já estão mapeados",
        detail: `${brl(recurringTotal)} por mês em recorrências ativas.`,
        icon: Repeat,
      });
    if (!result.length)
      result.push({
        id: "start",
        title: "Seu primeiro insight começa com um registro",
        detail:
          "Quanto mais claro o histórico, melhor o Clareza consegue mostrar seus próximos passos.",
        icon: Lightbulb,
      });
    return result.slice(0, 3);
  })();

  const chartData = Array.from(
    {
      length: new Date(
        Number(month.slice(0, 4)),
        Number(month.slice(5)),
        0,
      ).getDate(),
    },
    (_, index) => {
      const date = `${month}-${String(index + 1).padStart(2, "0")}`;
      return {
        day: String(index + 1),
        income:
          stats.tx
            .filter(
              (transaction) =>
                transaction.date <= date && transaction.type === "income",
            )
            .reduce((sum, transaction) => sum + transaction.amount, 0) / 100,
        expense:
          stats.tx
            .filter(
              (transaction) =>
                transaction.date <= date && transaction.type === "expense",
            )
            .reduce((sum, transaction) => sum + transaction.amount, 0) / 100,
      };
    },
  );

  return {
    stats,
    cash,
    cardDebt,
    cashPending,
    cardLimitAvailable,
    projection,
    categoryData,
    monthlyBudgets,
    agendaItems,
    alerts,
    insights,
    chartData,
    selectedAccount,
    selectedInvoice,
  };
}
