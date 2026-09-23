"use client";
import { useMemo, type CSSProperties } from "react";
import { ArrowRight, ArrowUpRight, CreditCard, Info, Pencil, Plus, Trash2 } from "lucide-react";

import { Progress } from "@/components/ui/progress";

import { balances, brl, creditCardInvoiceSummary, today } from "@/shared/finance";

import { monthLabel } from "@/frontend/finance/presentation";
import type { PageProps } from "@/frontend/finance/types";
import Empty from "@/frontend/components/finance/Empty";

export default function AccountsPage({ state, month, hidden, openEditor, askDelete, start, setView, setOverviewAccountId }: Pick<PageProps, "state" | "month" | "hidden" | "openEditor" | "askDelete" | "start" | "setView" | "setOverviewAccountId">) {
  function displayMoney(value: number) {
    return hidden ? "R$ •••••" : brl(value);
  }

  const balancesByAccount = useMemo(() => balances(state), [state]);
  const creditCards = useMemo(
    () => state.accounts
      .filter((account) => account.kind === "credit")
      .map((account) => ({
        account,
        summary: creditCardInvoiceSummary(state, account.id, month),
        totalDebt: Math.max(0, -(balancesByAccount[account.id] ?? 0)),
      })),
    [state, month, balancesByAccount],
  );
  return (
    <>
      <div className="section-head accounts-head">
        <h2>
          Minhas contas{" "}
          <span className="mini-badge">
            {
              state.accounts.filter(
                (account) => account.kind !== "credit",
              ).length
            }
          </span>
        </h2>
        <button
          className="text-button"
          onClick={() => openEditor("accounts")}
        >
          Adicionar conta <Plus size={16} />
        </button>
      </div>
      <div className="account-grid">
        {state.accounts
          .filter((account) => account.kind !== "credit")
          .map((account) => (
            <article
              className="panel account-card"
              key={account.id}
            >
              <div className="section-head">
                <span
                  className="bank-symbol"
                  style={{ background: account.color }}
                >
                  {account.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="row-actions">
                  <button
                    className="icon-button"
                    aria-label={`Editar ${account.name}`}
                    onClick={() => openEditor("accounts", account)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Excluir ${account.name}`}
                    onClick={() =>
                      askDelete(
                        "accounts",
                        account.id,
                        account.name,
                      )
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3>{account.name}</h3>
              <span className="soft-text">
                {account.kind === "cash"
                  ? "Dinheiro em mãos"
                  : "Conta bancária"}
              </span>
              <div className="account-balance">
                <span>Saldo atual</span>
                <strong>
                  {displayMoney(balancesByAccount[account.id] ?? 0)}
                </strong>
              </div>
              <div className="account-card-footer">
                <button
                  className="text-button"
                  onClick={() => {
                    setOverviewAccountId?.(account.id);
                    setView("overview");
                  }}
                >
                  Ver visão da conta <ArrowRight size={15} />
                </button>
              </div>
            </article>
          ))}
      </div>
      <div className="section-head accounts-head">
        <h2>Cartões de crédito</h2>
        <button
          className="text-button"
          onClick={() =>
            openEditor("accounts", undefined, { kind: "credit" })
          }
        >
          Adicionar cartão <Plus size={16} />
        </button>
      </div>
      <div className="account-grid">
        {creditCards.map(({ account, summary, totalDebt }) => {
          const target = account.monthlyTarget ?? 0;
          const remainingToTarget = Math.max(0, target - summary.spent);
          const targetProgress = target
            ? Math.min(100, (summary.spent / target) * 100)
            : 0;
          const comparison = summary.previousSpent === 0
            ? summary.spent > 0
              ? "Sem fatura anterior para comparar"
              : "Sem movimento na fatura anterior"
            : summary.change > 0
              ? `${displayMoney(summary.change)} a mais que na anterior`
              : summary.change < 0
                ? `${displayMoney(Math.abs(summary.change))} a menos que na anterior`
                : "Mesmo valor da fatura anterior";
          const targetMessage = hidden
            ? "Mostre os valores para acompanhar sua meta pessoal."
            : summary.spent > target
              ? `Você passou ${displayMoney(summary.spent - target)} da meta escolhida.`
              : summary.spent === target
                ? "Você chegou à meta planejada neste ciclo."
                : targetProgress >= 80
                  ? `Restam ${displayMoney(remainingToTarget)} até sua meta mensal.`
                  : `${displayMoney(remainingToTarget)} até sua meta mensal.`;
          const bankUse = account.limit
            ? Math.min(100, (totalDebt / account.limit) * 100)
            : 0;

          return (
            <article className="panel credit-container" key={account.id}>
              <div
                className="credit-learning-header"
                style={{ "--credit-accent": account.color } as CSSProperties}
              >
                <div>
                  <span>Fatura de {monthLabel(month)}</span>
                  <strong>{account.name}</strong>
                </div>
                <div className="credit-learning-due">
                  <CreditCard size={22} aria-hidden="true" />
                  <small>Vence dia {account.due}</small>
                </div>
              </div>
              <div className="credit-info">
                <div className="credit-spent-primary">
                  <span>Você gastou neste ciclo</span>
                  <strong>{displayMoney(summary.spent)}</strong>
                </div>

                <section className="credit-personal-target" aria-label="Meta pessoal mensal">
                  {target > 0 ? (
                    <>
                      <div className="credit-target-values">
                        <span>Meta pessoal do mês</span>
                        <strong>{displayMoney(target)}</strong>
                      </div>
                      <Progress
                        value={hidden ? 0 : targetProgress}
                        aria-label={hidden ? "Progresso da meta oculto" : "Progresso da meta pessoal mensal"}
                        className={summary.spent > target ? "credit-target-progress over" : "credit-target-progress"}
                      />
                      <p>{targetMessage}</p>
                    </>
                  ) : (
                    <div className="credit-no-target">
                      <p>Escolha quanto deseja gastar por mês para criar uma referência pessoal.</p>
                      <button
                        className="text-button"
                        onClick={() => openEditor("accounts", account)}
                      >
                        Definir meta mensal <ArrowRight size={15} />
                      </button>
                    </div>
                  )}
                </section>

                <div className="credit-learning-metrics">
                  <div>
                    <span>Em relação à fatura anterior</span>
                    <strong>{hidden ? "Valores ocultos" : comparison}</strong>
                  </div>
                  <div>
                    <span>Já pago</span>
                    <strong>{displayMoney(summary.paid)}</strong>
                  </div>
                  <div>
                    <span>Falta pagar desta fatura</span>
                    <strong>{displayMoney(summary.outstanding)}</strong>
                  </div>
                  <div>
                    <span>Compromissos em faturas futuras</span>
                    <strong>{displayMoney(summary.futureCommitted)}</strong>
                  </div>
                </div>

                {summary.topCategory && (
                  <p className="credit-category-insight">
                    Maior categoria: <strong>{hidden ? "Oculta" : summary.topCategory.name}</strong>
                    <span>{hidden ? "Valores ocultos" : displayMoney(summary.topCategory.amount)}</span>
                  </p>
                )}

                {summary.upcomingInvoices.length > 0 && (
                  <details className="credit-upcoming-detail">
                    <summary>Ver próximas faturas</summary>
                    <div>
                      {summary.upcomingInvoices.map((invoice) => (
                        <span key={invoice.month}>
                          {monthLabel(invoice.month)}
                          <strong>{displayMoney(invoice.outstanding)}</strong>
                        </span>
                      ))}
                    </div>
                  </details>
                )}

                <details className="credit-bank-limit">
                  <summary>
                    Limite concedido pelo banco
                    <strong>{displayMoney(account.limit)}</strong>
                  </summary>
                  <div>
                    <span>Uso total considerado no cartão</span>
                    <strong>{displayMoney(totalDebt)}</strong>
                  </div>
                  <Progress
                    value={hidden ? 0 : bankUse}
                    aria-label={hidden ? "Uso do limite bancário oculto" : "Uso do limite bancário"}
                    className="credit-bank-progress"
                  />
                </details>

                <div className="row-actions credit-actions">
                  <button
                    className="text-button"
                    onClick={() => {
                      setOverviewAccountId?.(account.id);
                      setView("overview");
                    }}
                  >
                    Analisar gastos <ArrowRight size={15} />
                  </button>
                  <button
                    className="text-button"
                    onClick={() =>
                      openEditor("transactions", undefined, {
                        type: "transfer",
                        toId: account.id,
                        title: `Pagamento · ${account.name}`,
                        invoiceMonth: month,
                        amount: (summary.outstanding / 100).toFixed(2),
                        date: today(),
                      })
                    }
                  >
                    Registrar pagamento <ArrowUpRight size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Editar ${account.name}`}
                    onClick={() => openEditor("accounts", account)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Excluir ${account.name}`}
                    onClick={() => askDelete("accounts", account.id, account.name)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!state.accounts.length && (
        <section className="panel">
          <Empty
            title="Todas as suas contas, um só lugar."
            text="Cadastre o saldo atual de uma conta para começar."
            action={
              <button className="primary-button" onClick={start}>
                Adicionar conta
              </button>
            }
          />
        </section>
      )}
      <div className="info-note">
        <Info size={18} />
        <p>
          Os saldos são calculados pelos seus registros. O pagamento
          do cartão é uma transferência e não soma uma nova despesa.
        </p>
      </div>
    </>
  );
}
