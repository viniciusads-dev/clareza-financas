"use client";
import { useMemo, type CSSProperties } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { Progress } from "@/components/ui/progress";

import { brl, monthStats } from "@/shared/finance";

import { categoryColorFor, categoryTotals } from "@/frontend/finance/presentation";
import type { PageProps } from "@/frontend/finance/types";
import Empty from "@/frontend/components/finance/Empty";
import CategoryIcon from "@/frontend/components/finance/CategoryIcon";

export default function BudgetsPage({ state, month, hidden, openEditor, askDelete }: Pick<PageProps, "state" | "month" | "hidden" | "openEditor" | "askDelete">) {
  function displayMoney(value: number) {
    return hidden ? "R$ •••••" : brl(value);
  }
  const categoryColor = (name: string) => categoryColorFor(state, name);
  const categoryData = useMemo(() => categoryTotals(monthStats(state, month).tx), [state, month]); const monthlyBudgets = useMemo(() => state.budgets.filter(budget => budget.month === month), [state.budgets, month]);
  return (
    <>
      <div className="budget-header panel">
        <div>
          <span>Planejado para o mês</span>
          <strong>
            {displayMoney(
              monthlyBudgets.reduce(
                (sum, budget) => sum + budget.amount,
                0,
              ),
            )}
          </strong>
        </div>
        <div>
          <span>Gastos nas categorias planejadas</span>
          <strong>
            {displayMoney(
              monthlyBudgets.reduce(
                (sum, budget) =>
                  sum +
                  (categoryData.find(
                    (category) => category.name === budget.category,
                  )?.value ?? 0),
                0,
              ),
            )}
          </strong>
        </div>
        <p>
          Seu orçamento é um guia.
          <br />
          Você pode ajustá-lo quando precisar.
        </p>
      </div>
      <div className="budget-grid">
        {monthlyBudgets.map((budget) => {
          const spent =
            categoryData.find(
              (category) => category.name === budget.category,
            )?.value ?? 0;
          const percentage = Math.round(
            (spent / budget.amount) * 100,
          );
          return (
            <article className="panel budget-card" key={budget.id}>
              <div className="section-head">
                <CategoryIcon
                  category={budget.category}
                  color={categoryColor(budget.category)}
                />
                <div className="row-actions">
                  <button
                    className="icon-button"
                    aria-label={`Editar orçamento ${budget.category}`}
                    onClick={() => openEditor("budgets", budget)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Excluir orçamento ${budget.category}`}
                    onClick={() =>
                      askDelete(
                        "budgets",
                        budget.id,
                        budget.category,
                      )
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3>{budget.category}</h3>
              <div className="budget-values">
                <strong>{displayMoney(spent)}</strong>
                <span>de {displayMoney(budget.amount)}</span>
              </div>
              <Progress
                value={Math.min(100, percentage)}
                style={
                  {
                    "--progress-color":
                      percentage > 100
                        ? "#c65b48"
                        : categoryColor(budget.category),
                  } as CSSProperties
                }
              />
              <p
                className={
                  percentage > 100 ? "over-budget" : "under-budget"
                }
              >
                {percentage > 100
                  ? `${displayMoney(spent - budget.amount)} acima do planejado`
                  : `${displayMoney(budget.amount - spent)} para usar no mês`}
              </p>
            </article>
          );
        })}
      </div>
      {!monthlyBudgets.length && (
        <section className="panel">
          <Empty
            title="Comece com uma categoria."
            text="Escolha um limite confortável. Você pode ajustar depois."
            action={
              <button
                className="primary-button"
                onClick={() => openEditor("budgets")}
              >
                Criar orçamento
              </button>
            }
          />
        </section>
      )}
    </>
  );
}
