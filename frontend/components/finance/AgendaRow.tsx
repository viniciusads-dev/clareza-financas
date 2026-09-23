"use client";
import { Pencil, Trash2 } from "lucide-react";
import { shortDate } from "@/frontend/finance/presentation";
import type { AgendaItem, PageProps } from "@/frontend/finance/types";
import { brl, today } from "@/shared/finance";
export default function AgendaRow({ item, hidden, openEditor, askDelete }: {
  item: AgendaItem;
  hidden: boolean;
  openEditor?: PageProps["openEditor"];
  askDelete?: PageProps["askDelete"];
}) {
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
          {item.accountName ? `${item.accountName} · ` : ""}
          {item.context ?? (item.recurring ? "Recorrente" : item.category)}
        </span>
      </div>
      <strong className={item.type === "income" ? "income" : ""}>
        {item.type === "income" ? "+" : "−"} {displayMoney(item.amount)}
      </strong>
      {item.source && openEditor && askDelete && (
        <div className="row-actions agenda-row-actions">
          <button
            className="icon-button"
            aria-label={`Editar ${item.title}`}
            onClick={() => openEditor(item.source!.kind, item.source!.record)}
          >
            <Pencil size={16} />
          </button>
          <button
            className="icon-button"
            aria-label={`Excluir ${item.title}`}
            onClick={() => askDelete(item.source!.kind, item.source!.record.id, item.title)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
