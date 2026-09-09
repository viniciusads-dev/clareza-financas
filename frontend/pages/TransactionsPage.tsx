"use client";
import "@/frontend/components/finance/transaction-pagination.css";
import { Pagination } from "@/components/ui/pagination";
import { useMemo, useState } from "react";
import { Download, Plus, Search } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { monthStats } from "@/shared/finance";

import { toast } from "sonner";

import type { PageProps } from "@/frontend/finance/types";
import Empty from "@/frontend/components/finance/Empty";

import TransactionTable from "@/frontend/components/finance/TransactionTable";

import { filterTransactions } from "@/frontend/finance/transactions";
export default function TransactionsPage({ state, month, hidden, demo, openEditor, askDelete, uiSession }: Pick<PageProps, "state" | "month" | "hidden" | "demo" | "openEditor" | "askDelete" | "uiSession">) {

  const [controls, setControls] = useState(uiSession.getTransactions);
  const { search, filter } = controls;
  function updateControls(next: typeof controls) {
    uiSession.setTransactions(next);
    setControls(next);
  }
  const setSearch = (search: string) => updateControls({ ...controls, search, page: 1 });
  const setFilter = (filter: string) => updateControls({ ...controls, filter, page: 1 });
  const stats = useMemo(() => monthStats(state, month), [state, month]);
  const txSorted = useMemo(() => filterTransactions(state, stats.tx, search, filter), [state, stats.tx, search, filter]);
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
        state.accounts.find((account) => account.id === transaction.accountId)
          ?.name ?? "",
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
    anchor.download = `clareza-${month}${demo ? "-exemplo" : ""}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Lançamentos exportados.");
  }
  return (
    <section className="panel">
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
          <button className="secondary-button" onClick={exportCsv}>
            <Download size={17} /> CSV
          </button>
        </div>
      </div>
      {txSorted.length ? (
        <TransactionTable rows={visibleTransactions} state={state} hidden={hidden} openEditor={openEditor} askDelete={askDelete} />
      ) : (
        <Empty
          title="Nenhum lançamento por aqui."
          text="Tente outro mês ou filtro, ou registre um novo movimento."
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
