"use client";
import { shortDate } from "@/frontend/finance/presentation";
import type { AgendaItem } from "@/frontend/finance/types";
import { brl, today } from "@/shared/finance";
export default function AgendaRow({ item, hidden }: { item: AgendaItem; hidden: boolean }) {
  const currentDate = today(); function displayMoney(value: number) {
    return hidden ? "R$ •••••" : brl(value);
  }
  return (
    <div className="agenda-row" key={item.id}>
      <div
        className={`agenda-date ${item.date < currentDate ? "overdue" : ""}`}
      >
        <strong>{item.date.slice(-2)}</strong>
        <span>
          {new Date(`${item.date}T12:00:00`)
            .toLocaleDateString("pt-BR", { month: "short" })
            .replace(".", "")}
        </span>
      </div>
      <div className="agenda-main">
        <strong>{item.title}</strong>
        <span>
          {item.date < currentDate ? "Vencido" : shortDate(item.date)} ·{" "}
          {item.recurring ? "Recorrente" : item.category}
        </span>
      </div>
      <strong className={item.type === "income" ? "income" : ""}>
        {item.type === "income" ? "+" : "−"} {displayMoney(item.amount)}
      </strong>
    </div>
  );
}
