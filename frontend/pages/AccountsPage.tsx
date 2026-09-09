"use client";
import { useMemo } from "react";
import { ArrowUpRight, CreditCard, Info, Pencil, Plus, Trash2 } from "lucide-react";

import { Progress } from "@/components/ui/progress";

import { balances, brl, invoiceBalance, today } from "@/shared/finance";

import { monthLabel } from "@/frontend/finance/presentation";
import type { PageProps } from "@/frontend/finance/types";
import Empty from "@/frontend/components/finance/Empty";

export default function AccountsPage({ state, month, hidden, openEditor, askDelete, start }: Pick<PageProps, "state" | "month" | "hidden" | "openEditor" | "askDelete" | "start">) {
  function displayMoney(value: number) {
    return hidden ? "R$ •••••" : brl(value);
  }

  const balancesByAccount = useMemo(() => balances(state), [state]);
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
        {state.accounts
          .filter((account) => account.kind === "credit")
          .map((account) => {
            const invoice = invoiceBalance(
              state,
              account.id,
              month,
            );
            return (
              <article
                className="panel credit-container"
                key={account.id}
              >
                <div
                  className="credit-face"
                  style={{ background: account.color }}
                >
                  <div>
                    <strong>{account.name}</strong>
                    <CreditCard size={26} />
                  </div>
                  <span>Fatura de {monthLabel(month)}</span>
                  <strong>{displayMoney(invoice)}</strong>
                  <div>
                    <small>Fecha dia {account.closing}</small>
                    <small>Vence dia {account.due}</small>
                  </div>
                </div>
                <div className="credit-info">
                  <span>
                    Dívida total, incluindo parcelas futuras{" "}
                    <strong>
                      {displayMoney(
                        Math.max(
                          0,
                          -(balancesByAccount[account.id] ?? 0),
                        ),
                      )}
                    </strong>
                  </span>
                  <span>
                    Limite cadastrado{" "}
                    <strong>{displayMoney(account.limit)}</strong>
                  </span>
                  <Progress
                    value={
                      account.limit
                        ? Math.min(
                          100,
                          (Math.max(
                            0,
                            -(balancesByAccount[account.id] ?? 0),
                          ) /
                            account.limit) *
                          100,
                        )
                        : 0
                    }
                  />
                  <div className="row-actions">
                    <button
                      className="text-button"
                      onClick={() =>
                        openEditor("transactions", undefined, {
                          type: "transfer",
                          toId: account.id,
                          title: `Pagamento · ${account.name}`,
                          invoiceMonth: month,
                          amount: (invoice / 100).toFixed(2),
                          date: today(),
                        })
                      }
                    >
                      Registrar pagamento <ArrowUpRight size={16} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Editar ${account.name}`}
                      onClick={() =>
                        openEditor("accounts", account)
                      }
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
