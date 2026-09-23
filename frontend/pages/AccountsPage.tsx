"use client";
import { useMemo, useState, type CSSProperties } from "react";
import { ArrowRight, ArrowUpRight, CreditCard, Info, Pencil, Plus, Trash2 } from "lucide-react";

import { Progress } from "@/components/ui/progress";

import { balances, brl, cardInvoiceForPurchaseDate, cardInvoicesFor, today, type Account, type CardInvoice, type State } from "@/shared/finance";

import { monthLabel } from "@/frontend/finance/presentation";
import type { PageProps } from "@/frontend/finance/types";
import Empty from "@/frontend/components/finance/Empty";
import TransactionTable from "@/frontend/components/finance/TransactionTable";

function dayMonth(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function statusLabel(status: CardInvoice["status"]) {
  return status === "paid" ? "Paga" : status === "overdue" ? "Vencida" : status === "closed" ? "Fechada" : "Em formação";
}

function CreditCardPanel({
  state,
  account,
  totalDebt,
  hidden,
  openEditor,
  askDelete,
  setView,
  setOverviewAccountId,
}: {
  state: State;
  account: Account;
  totalDebt: number;
  hidden: boolean;
  openEditor: PageProps["openEditor"];
  askDelete: PageProps["askDelete"];
  setView: PageProps["setView"];
  setOverviewAccountId: PageProps["setOverviewAccountId"];
}) {
  const invoices = useMemo(() => cardInvoicesFor(state, account), [state, account]);
  const currentId = cardInvoiceForPurchaseDate(account, today()).id;
  const [selectedId, setSelectedId] = useState(currentId);
  const selectedIndex = invoices.findIndex((invoice) => invoice.id === selectedId);
  const currentIndex = invoices.findIndex((invoice) => invoice.id === currentId);
  const invoice = invoices[selectedIndex >= 0 ? selectedIndex : Math.max(0, currentIndex)];
  const target = account.monthlyTarget ?? 0;
  const remainingToTarget = Math.max(0, target - invoice.spent);
  const targetProgress = target
    ? Math.min(100, (invoice.spent / target) * 100)
    : 0;
  const comparison = invoice.previousSpent === 0
    ? invoice.spent > 0
      ? "Sem fatura anterior para comparar"
      : "Sem movimento na fatura anterior"
    : invoice.spent > invoice.previousSpent
      ? `${hidden ? "Valor oculto" : brl(invoice.spent - invoice.previousSpent)} a mais que na anterior`
      : invoice.spent < invoice.previousSpent
        ? `${hidden ? "Valor oculto" : brl(invoice.previousSpent - invoice.spent)} a menos que na anterior`
        : "Mesmo valor da fatura anterior";
  const targetMessage = hidden
    ? "Mostre os valores para acompanhar sua meta por fatura."
    : invoice.spent > target
      ? `Você passou ${brl(invoice.spent - target)} da meta escolhida.`
      : invoice.spent === target
        ? "Você chegou à meta planejada nesta fatura."
        : `${brl(remainingToTarget)} até sua meta por fatura.`;
  const futureCommitted = invoices
    .filter((item) => item.periodEnd > invoice.periodEnd)
    .reduce((sum, item) => sum + item.projectedOutstanding, 0);
  const currentLabel = invoice.id === currentId
    ? "Fatura atual"
    : invoice.periodEnd < cardInvoiceForPurchaseDate(account, today()).periodEnd
      ? "Faturas anteriores"
      : "Próxima fatura";
  const currentYear = today().slice(0, 4);
  const dueDate = invoice.dueDate.slice(0, 4) === currentYear
    ? dayMonth(invoice.dueDate)
    : new Date(`${invoice.dueDate}T12:00:00`).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      });
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
          <span>{currentLabel} · Fatura de {monthLabel(invoice.dueMonth)}</span>
          <strong>{account.name}</strong>
        </div>
        <div className="credit-learning-due">
          <CreditCard size={22} aria-hidden="true" />
          <small>Vencimento: {dueDate}</small>
        </div>
      </div>
      <div className="credit-info">
        <div className="credit-invoice-navigation">
          <button
            type="button"
            className="secondary-button"
            disabled={selectedIndex <= 0}
            onClick={() => setSelectedId(invoices[Math.max(0, selectedIndex - 1)]?.id ?? currentId)}
          >
            Fatura anterior
          </button>
          <label className="field">
            <span>Selecionar fatura</span>
            <select
              value={invoice.id}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {[...invoices].reverse().map((item) => (
                <option value={item.id} key={item.id}>
                  Fatura de {monthLabel(item.dueMonth)} · {dayMonth(item.periodStart)}–{dayMonth(item.periodEnd)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="secondary-button"
            disabled={selectedIndex < 0 || selectedIndex >= invoices.length - 1}
            onClick={() => setSelectedId(invoices[Math.min(invoices.length - 1, selectedIndex + 1)]?.id ?? currentId)}
          >
            Próxima fatura
          </button>
          <span className={`credit-invoice-status ${invoice.status}`}>
            {statusLabel(invoice.status)}
          </span>
        </div>
        <p className="credit-invoice-period">
          Período da fatura: {dayMonth(invoice.periodStart)}–{dayMonth(invoice.periodEnd)}
          {invoice.periodStart.slice(0, 4) !== invoice.periodEnd.slice(0, 4)
            ? `/${invoice.periodStart.slice(0, 4)}–${invoice.periodEnd.slice(0, 4)}`
            : `/${invoice.periodEnd.slice(0, 4)}`}
        </p>
        <div className="credit-spent-primary">
          <span>Compras nesta fatura</span>
          <strong>{hidden ? "R$ •••••" : brl(invoice.spent)}</strong>
        </div>

        <section className="credit-personal-target" aria-label="Meta pessoal por fatura">
          {target > 0 ? (
            <>
              <div className="credit-target-values">
                <span>Meta pessoal por fatura</span>
                <strong>{hidden ? "R$ •••••" : brl(target)}</strong>
              </div>
              <Progress
                value={hidden ? 0 : targetProgress}
                aria-label={hidden ? "Progresso da meta oculto" : "Progresso da meta por fatura"}
                className={invoice.spent > target ? "credit-target-progress over" : "credit-target-progress"}
              />
              <p>{targetMessage}</p>
            </>
          ) : (
            <div className="credit-no-target">
              <p>Escolha quanto deseja gastar por fatura para criar uma referência pessoal.</p>
              <button className="text-button" onClick={() => openEditor("accounts", account)}>
                Definir meta de gastos <ArrowRight size={15} />
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
            <span>Pago até hoje</span>
            <strong>{hidden ? "R$ •••••" : brl(invoice.paid)}</strong>
          </div>
          <div>
            <span>Em aberto</span>
            <strong>{hidden ? "R$ •••••" : brl(invoice.outstanding)}</strong>
          </div>
          <div>
            <span>Pagamento agendado</span>
            <strong>{hidden ? "R$ •••••" : brl(invoice.scheduledPayment)}</strong>
          </div>
          <div>
            <span>Saldo previsto após agendamento</span>
            <strong>{hidden ? "R$ •••••" : brl(invoice.projectedOutstanding)}</strong>
          </div>
          <div>
            <span>Compromissos em faturas futuras</span>
            <strong>{hidden ? "R$ •••••" : brl(futureCommitted)}</strong>
          </div>
        </div>

        {invoice.topCategory && (
          <p className="credit-category-insight">
            Maior categoria: <strong>{hidden ? "Oculta" : invoice.topCategory.name}</strong>
            <span>{hidden ? "Valores ocultos" : brl(invoice.topCategory.amount)}</span>
          </p>
        )}

        <details className="credit-invoice-purchases" open={invoice.purchases.length > 0}>
          <summary>Compras desta fatura ({invoice.purchases.length})</summary>
          {invoice.purchases.length ? (
            <TransactionTable
              rows={invoice.purchases}
              state={state}
              hidden={hidden}
              openEditor={openEditor}
              askDelete={askDelete}
            />
          ) : (
            <p>Nenhuma compra associada a esta fatura.</p>
          )}
        </details>

        <details className="credit-bank-limit">
          <summary>
            Limite concedido pelo banco
            <strong>{hidden ? "R$ •••••" : brl(account.limit)}</strong>
          </summary>
          <div>
            <span>Uso total considerado no cartão</span>
            <strong>{hidden ? "R$ •••••" : brl(totalDebt)}</strong>
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
            disabled={invoice.projectedOutstanding <= 0}
            onClick={() =>
              openEditor("transactions", undefined, {
                type: "transfer",
                toId: account.id,
                title: `Pagamento · ${account.name}`,
                invoiceMonth: invoice.dueMonth,
                cardInvoiceId: invoice.id,
                cardInvoicePeriodStart: invoice.periodStart,
                cardInvoicePeriodEnd: invoice.periodEnd,
                cardInvoiceDueDate: invoice.dueDate,
                amount: (invoice.projectedOutstanding / 100).toFixed(2).replace(".", ","),
                date: today(),
              })
            }
          >
            {invoice.projectedOutstanding > 0 ? "Registrar pagamento" : "Fatura coberta"} <ArrowUpRight size={16} />
          </button>
          <button className="icon-button" aria-label={`Editar ${account.name}`} onClick={() => openEditor("accounts", account)}>
            <Pencil size={16} />
          </button>
          <button className="icon-button" aria-label={`Excluir ${account.name}`} onClick={() => askDelete("accounts", account.id, account.name)}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function AccountsPage({ state, hidden, openEditor, askDelete, start, setView, setOverviewAccountId }: Pick<PageProps, "state" | "hidden" | "openEditor" | "askDelete" | "start" | "setView" | "setOverviewAccountId">) {
  function displayMoney(value: number) {
    return hidden ? "R$ •••••" : brl(value);
  }

  const balancesByAccount = useMemo(() => balances(state), [state]);
  const creditCards = useMemo(
    () => state.accounts
      .filter((account) => account.kind === "credit")
      .map((account) => ({
        account,
        totalDebt: Math.max(0, -(balancesByAccount[account.id] ?? 0)),
      })),
    [state.accounts, balancesByAccount],
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
        {creditCards.map(({ account, totalDebt }) => (
          <CreditCardPanel
            key={account.id}
            state={state}
            account={account}
            totalDebt={totalDebt}
            hidden={hidden}
            openEditor={openEditor}
            askDelete={askDelete}
            setView={setView}
            setOverviewAccountId={setOverviewAccountId}
          />
        ))}
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
