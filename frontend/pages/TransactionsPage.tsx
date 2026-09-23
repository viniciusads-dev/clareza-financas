"use client";
import "@/frontend/components/finance/transaction-pagination.css";
import { Pagination } from "@/components/ui/pagination";
import { useMemo, useState } from "react";
import { Download, Plus, Search } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { cardInvoiceForPurchaseDate, cardInvoicesFor, monthStats, today } from "@/shared/finance";
import { monthLabel } from "@/frontend/finance/presentation";

import { toast } from "sonner";

import type { PageProps } from "@/frontend/finance/types";
import Empty from "@/frontend/components/finance/Empty";

import TransactionTable from "@/frontend/components/finance/TransactionTable";

import { filterTransactions } from "@/frontend/finance/transactions";
export default function TransactionsPage({ state, month, hidden, demo, openEditor, askDelete, uiSession }: Pick<PageProps, "state" | "month" | "hidden" | "demo" | "openEditor" | "askDelete" | "uiSession">) {

  const [controls, setControls] = useState(uiSession.getTransactions);
  const [cardId, setCardId] = useState("all");
  const [invoiceId, setInvoiceId] = useState("");
  const { search, filter } = controls;
  function updateControls(next: typeof controls) {
    uiSession.setTransactions(next);
    setControls(next);
  }
  const setSearch = (search: string) => updateControls({ ...controls, search, page: 1 });
  const setFilter = (filter: string) => updateControls({ ...controls, filter, page: 1 });
  const stats = useMemo(() => monthStats(state, month), [state, month]);
  const selectedCard = state.accounts.find((account) => account.id === cardId && account.kind === "credit");
  const invoices = useMemo(
    () => selectedCard ? cardInvoicesFor(state, selectedCard) : [],
    [state, selectedCard],
  );
  const currentInvoiceId = selectedCard ? cardInvoiceForPurchaseDate(selectedCard, today()).id : "";
  const selectedInvoice = selectedCard
    ? invoices.find((invoice) => invoice.id === invoiceId) ??
      invoices.find((invoice) => invoice.id === currentInvoiceId) ??
      invoices[invoices.length - 1]
    : undefined;
  const scopedTransactions = useMemo(
    () => selectedInvoice
      ? [...selectedInvoice.purchases, ...selectedInvoice.payments]
      : stats.tx,
    [selectedInvoice, stats.tx],
  );
  const txSorted = useMemo(() => filterTransactions(state, scopedTransactions, search, filter), [state, scopedTransactions, search, filter]);
  const pageCount = Math.max(1, Math.ceil(txSorted.length / 50));
  const page = Math.min(controls.page, pageCount);
  const visibleTransactions = txSorted.slice((page - 1) * 50, page * 50);
  function exportCsv() {
    const rows = [
      [
        "Data",
        "Descrição",
        "Tipo",
        "Categoria",
        "Subcategoria",
        "Valor",
        "Conta",
        "Status",
      ],
        ...txSorted.map((transaction) => [
        transaction.date,
        transaction.title,
        transaction.type === "expense"
          ? "Despesa"
          : transaction.type === "income"
            ? "Receita"
            : "Transferência",
        transaction.category,
        transaction.subcategory ?? "",
        (transaction.amount / 100).toFixed(2).replace(".", ","),
        [
          state.accounts.find((account) => account.id === transaction.accountId)?.name ?? "",
          transaction.toId ? `→ ${state.accounts.find((account) => account.id === transaction.toId)?.name ?? ""}` : "",
        ].filter(Boolean).join(" "),
        transaction.status === "paid" ? "Concluído" : "Pendente",
      ]),
    ];
    const escape = (value: string) =>
      `"${(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value).replace(/"/g, '""')}"`;
    const blob = new Blob(
      ["\ufeff" + rows.map((row) => row.map(escape).join(";")).join("\r\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const scopeName = selectedCard && selectedInvoice
      ? `fatura-${selectedCard.name}-${selectedInvoice.dueMonth}`
      : month;
    anchor.download = `clareza-${scopeName.replace(/[^a-z0-9-]/gi, "-")}${demo ? "-exemplo" : ""}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Lançamentos exportados.");
  }
  return (
    <section className="panel">
      <div className="transaction-invoice-filters">
        <label className="field">
          <span>Visualizar movimentos</span>
          <select
            value={cardId}
            onChange={(event) => {
              const nextCardId = event.target.value;
              setCardId(nextCardId);
              const nextCard = state.accounts.find((account) => account.id === nextCardId && account.kind === "credit");
              setInvoiceId(nextCard ? cardInvoiceForPurchaseDate(nextCard, today()).id : "");
              updateControls({ ...controls, page: 1 });
            }}
          >
            <option value="all">Todos os lançamentos de {monthLabel(month)}</option>
            {state.accounts.filter((account) => account.kind === "credit").map((account) => (
              <option value={account.id} key={account.id}>Faturas · {account.name}</option>
            ))}
          </select>
        </label>
        {selectedCard && selectedInvoice && (
          <label className="field">
            <span>Fatura do cartão</span>
            <select value={selectedInvoice.id} onChange={(event) => { setInvoiceId(event.target.value); updateControls({ ...controls, page: 1 }); }}>
              {[...invoices].reverse().map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.periodEnd < today() ? "Anterior" : invoice.id === currentInvoiceId ? "Atual" : "Próxima"} · Fatura de {monthLabel(invoice.dueMonth)} · vence {new Date(`${invoice.dueDate}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="transaction-controls">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="expense">Despesas</TabsTrigger>
            <TabsTrigger value="income">Receitas</TabsTrigger>
            <TabsTrigger value="pending">Pendentes</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="search-actions">
          <label className="search-field">
            <Search size={17} />
            <input
              placeholder="Buscar lançamento"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Buscar lançamento"
            />
          </label>
          <button
            className="secondary-button"
            onClick={exportCsv}
            aria-label="Exportar CSV com os valores reais"
            title="O CSV contém os valores reais, mesmo quando a tela oculta valores."
          >
            <Download size={17} /> CSV
          </button>
          <span className="export-note">O CSV inclui os valores reais.</span>
        </div>
      </div>
      {txSorted.length ? (
        <TransactionTable rows={visibleTransactions} state={state} hidden={hidden} openEditor={openEditor} askDelete={askDelete} />
      ) : (
        <Empty
          title="Nenhum lançamento por aqui."
          text={selectedCard && selectedInvoice
            ? "Esta fatura ainda não tem movimentos. Você pode registrar uma compra ou pagamento."
            : "Tente outro mês ou filtro, ou registre um novo movimento."}
          action={
            <button
              className="primary-button"
              onClick={() => openEditor("transactions")}
            >
              <Plus size={17} /> Novo lançamento
            </button>
          }
        />
      )}
      {pageCount > 1 && (
        <Pagination className="transaction-pagination" aria-label="Paginação de lançamentos">
          <button className="secondary-button" disabled={page === 1}
            onClick={() => updateControls({ ...controls, page: page - 1 })}>
            Anterior
          </button>
          <span role="status">{page} de {pageCount} · {txSorted.length} lançamentos</span>
          <button className="secondary-button" disabled={page === pageCount}
            onClick={() => updateControls({ ...controls, page: page + 1 })}>
            Próxima
          </button>
        </Pagination>
      )}
    </section>
  );
}
