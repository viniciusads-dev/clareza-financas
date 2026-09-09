"use client";
import { useMemo } from "react";
import { Bell, Briefcase, Pencil, Plus, Repeat, Trash2 } from "lucide-react";

import { brl } from "@/shared/finance";

import { shortDate, frequencyLabels, agendaFor } from "@/frontend/finance/presentation";
import type { PageProps } from "@/frontend/finance/types";
import Empty from "@/frontend/components/finance/Empty";

import AgendaRow from "@/frontend/components/finance/AgendaRow";

export default function AgendaPage({ state, hidden, openEditor, askDelete }: Pick<PageProps, "state" | "hidden" | "openEditor" | "askDelete">) {
  function displayMoney(value: number) {
    return hidden ? "R$ •••••" : brl(value);
  }

  const agendaItems = useMemo(() => agendaFor(state), [state]);
  return (
    <>
      <section className="panel agenda-page">
        <div className="section-head">
          <div>
            <h2>O que pede atenção</h2>
            <p>
              Contas pendentes e recorrências dos próximos 30 dias.
            </p>
          </div>
          <Bell size={19} />
        </div>
        {agendaItems.length ? (
          agendaItems.map(item => <AgendaRow key={item.id} item={item} hidden={hidden} />)
        ) : (
          <Empty
            title="Agenda tranquila."
            text="Quando você registrar compromissos, eles aparecerão aqui."
          />
        )}
      </section>
      <section className="panel recurrence-panel">
        <div className="section-head">
          <div>
            <h2>Recebimento automático</h2>
            <p>
              Transforme sua renda planejada em uma entrada no dia
              certo, sem lançar duas vezes.
            </p>
          </div>
          <Briefcase size={19} />
        </div>
        {state.incomePlans.length ? (
          <div className="recurrence-list">
            {state.incomePlans.map((plan) => {
              const account = state.accounts.find(
                (item) => item.id === plan.accountId,
              );
              return (
                <div className="recurrence-row" key={plan.id}>
                  <span className="recurrence-icon">
                    <Briefcase size={17} />
                  </span>
                  <div>
                    <strong>{plan.title}</strong>
                    <span>
                      {plan.automatic
                        ? `Todo dia ${String(plan.dayOfMonth).padStart(2, "0")} · ${account?.name ?? "Conta não vinculada"} · próximo em ${plan.nextDate ? shortDate(plan.nextDate) : "a calcular"}`
                        : "Só planejamento · configure o dia e a conta para automatizar"}
                    </span>
                  </div>
                  <strong
                    className={
                      plan.automatic && plan.active
                        ? ""
                        : "muted-status"
                    }
                  >
                    {displayMoney(plan.amount)}
                  </strong>
                  <div className="row-actions">
                    <button
                      className="icon-button"
                      aria-label={`Editar ${plan.title}`}
                      onClick={() =>
                        openEditor("incomePlans", plan)
                      }
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Excluir ${plan.title}`}
                      onClick={() =>
                        askDelete("incomePlans", plan.id, plan.title)
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty
            title="Nenhum recebimento automático configurado."
            text="Sua renda do onboarding fica só no planejamento até você escolher o dia e a conta de destino."
            action={
              <button
                className="primary-button"
                onClick={() => openEditor("incomePlans")}
              >
                <Plus size={16} /> Configurar recebimento
              </button>
            }
          />
        )}
      </section>
      <section className="panel recurrence-panel">
        <div className="section-head">
          <div>
            <h2>Lançamentos recorrentes</h2>
            <p>
              O Clareza cria o lançamento quando chega a data, sem
              serviço externo.
            </p>
          </div>
          <button
            className="primary-button"
            onClick={() => openEditor("recurrences")}
          >
            <Plus size={16} /> Nova recorrência
          </button>
        </div>
        {state.recurrences.length ? (
          <div className="recurrence-list">
            {state.recurrences.map((recurrence) => (
              <div className="recurrence-row" key={recurrence.id}>
                <span className="recurrence-icon">
                  <Repeat size={17} />
                </span>
                <div>
                  <strong>{recurrence.title}</strong>
                  <span>
                    {frequencyLabels[recurrence.frequency]} ·{" "}
                    {recurrence.category} · próximo em{" "}
                    {shortDate(recurrence.nextDate)}
                  </span>
                </div>
                <strong
                  className={
                    recurrence.active ? "" : "muted-status"
                  }
                >
                  {recurrence.active
                    ? displayMoney(recurrence.amount)
                    : "Pausada"}
                </strong>
                <div className="row-actions">
                  <button
                    className="icon-button"
                    aria-label={`Editar recorrência ${recurrence.title}`}
                    onClick={() =>
                      openEditor("recurrences", recurrence)
                    }
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Excluir recorrência ${recurrence.title}`}
                    onClick={() =>
                      askDelete(
                        "recurrences",
                        recurrence.id,
                        recurrence.title,
                      )
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="Nenhuma recorrência ainda."
            text="Cadastre salário, aluguel ou assinaturas para não precisar repetir o mesmo trabalho."
            action={
              <button
                className="primary-button"
                onClick={() => openEditor("recurrences")}
              >
                <Plus size={16} /> Cadastrar recorrência
              </button>
            }
          />
        )}
      </section>
    </>
  );
}
