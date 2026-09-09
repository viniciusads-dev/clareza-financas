"use client";
import { Progress } from "@/components/ui/progress";
import { monthsUntil, shortDate } from "@/frontend/finance/presentation";
import type { PageProps } from "@/frontend/finance/types";
import { brl, type Goal } from "@/shared/finance";
import { ArrowUpRight, Sparkles, Target, Trash2 } from "lucide-react";
import { type CSSProperties } from "react";
export default function GoalCard({ goal, hidden, openEditor, askDelete, canDelete = false }: Pick<PageProps, "hidden" | "openEditor" | "askDelete"> & { goal: Goal; canDelete?: boolean }) {
  function displayMoney(value: number) {
    return hidden ? "R$ •••••" : brl(value);
  }

  const percentage = Math.min(
    100,
    Math.round((goal.saved / goal.target) * 100),
  );
  const remaining = Math.max(0, goal.target - goal.saved);
  const monthly = remaining
    ? Math.ceil(remaining / monthsUntil(goal.date))
    : 0;
  return (
    <article className="goal-item" key={goal.id}>
      <div className="section-head">
        <span
          className="category-icon"
          style={{ background: `${goal.color}18`, color: goal.color }}
        >
          <Target size={20} />
        </span>
        <span className="goal-percent">{percentage}%</span>
      </div>
      <h3>{goal.name}</h3>
      <p>
        <strong>{displayMoney(goal.saved)}</strong>{" "}
        <span>de {displayMoney(goal.target)}</span>
      </p>
      <Progress
        value={percentage}
        style={{ "--progress-color": goal.color } as CSSProperties}
      />
      <div className="goal-smart">
        <Sparkles size={14} />
        {remaining
          ? `Sugestão: ${displayMoney(monthly)} por mês`
          : "Meta concluída. Que conquista!"}
      </div>
      <div className="goal-bottom">
        <span>
          {shortDate(goal.date)} de {goal.date.slice(0, 4)}
        </span>
        <button
          className="text-button"
          onClick={() => openEditor("goals", goal)}
        >
          Atualizar <ArrowUpRight size={15} />
        </button>
        {canDelete && (
          <button
            className="icon-button"
            aria-label={`Excluir meta ${goal.name}`}
            onClick={() => askDelete("goals", goal.id, goal.name)}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </article>
  );
}
