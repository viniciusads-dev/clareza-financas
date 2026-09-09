import { agendaFor, categoryTotals } from "@/frontend/finance/presentation";
import type { AlertItem } from "@/frontend/finance/types";
import { addDays, addMonths, balances, brl, monthStats, today, type State } from "@/shared/finance";
import { CircleAlert, Lightbulb, Repeat, TrendingUp } from "lucide-react";
export function overviewModel(state: State, month: string) {
  const stats = monthStats(state, month);
  const previousStats = monthStats(state, addMonths(`${month}-01`, -1).slice(0, 7));
  const balancesByAccount = balances(state);
  const cash = state.accounts
    .filter((account) => account.kind !== "credit")
    .reduce((sum, account) => sum + (balancesByAccount[account.id] ?? 0), 0);
  const cardDebt = state.accounts
    .filter((account) => account.kind === "credit")
    .reduce(
      (sum, account) =>
        sum + Math.max(0, -(balancesByAccount[account.id] ?? 0)),
      0,
    );
  const cashPending = state.transactions
    .filter(
      (transaction) =>
        transaction.type === "expense" &&
        transaction.status === "pending" &&
        state.accounts.find((account) => account.id === transaction.accountId)
          ?.kind !== "credit",
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const available = cash - cardDebt - cashPending;
  const currentDate = today();



  const categoryData = categoryTotals(stats.tx);
  const previousCategoryData = categoryTotals(previousStats.tx);
  const monthlyBudgets = state.budgets.filter(
    (budget) => budget.month === month,
  );


  const agendaItems = agendaFor(state, currentDate);
  const alerts: AlertItem[] = (() => {
    const items: AlertItem[] = [];
    const overdue = state.transactions.filter(
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
    const recurringTotal = state.recurrences
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


  return { stats, cash, cardDebt, cashPending, available, categoryData, monthlyBudgets, agendaItems, alerts, insights, chartData };
}
