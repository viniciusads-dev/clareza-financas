"use client";

import { Info } from "lucide-react";

import type { PageProps } from "@/frontend/finance/types";
import Empty from "@/frontend/components/finance/Empty";

import GoalCard from "@/frontend/components/finance/GoalCard";

export default function GoalsPage({ state, hidden, openEditor, askDelete }: Pick<PageProps, "state" | "hidden" | "openEditor" | "askDelete">) {

  return (
    <>
      <div className="goals-grid standalone-goals">
        {state.goals.map(goal => <GoalCard key={goal.id} goal={goal} hidden={hidden} openEditor={openEditor} askDelete={askDelete} canDelete={true} />)}
      </div>
      {!state.goals.length && (
        <section className="panel">
          <Empty
            title="Qual é seu próximo plano?"
            text="Dê um nome à sua meta e acompanhe o que já guardou."
            action={
              <button
                className="primary-button"
                onClick={() => openEditor("goals")}
              >
                Criar minha primeira meta
              </button>
            }
          />
        </section>
      )}
      <div className="info-note">
        <Info size={18} />
        <p>
          Agora o Clareza sugere um valor mensal com base no que
          falta e no prazo informado. Atualizar a meta não movimenta
          suas contas.
        </p>
      </div>
    </>
  );
}
