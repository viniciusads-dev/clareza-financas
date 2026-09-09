"use client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CategoryIcon from "@/frontend/components/finance/CategoryIcon";
import { categoryColorFor, isPendingTransaction, shortDate } from "@/frontend/finance/presentation";
import type { PageProps } from "@/frontend/finance/types";
import { brl, type Transaction } from "@/shared/finance";
import { Pencil, Trash2 } from "lucide-react";
export default function TransactionTable({ rows, state, hidden, openEditor, askDelete, compact = false }: Pick<PageProps, "state" | "hidden" | "openEditor" | "askDelete"> & { rows: Transaction[]; compact?: boolean }) {
  function displayMoney(value: number) {
    return hidden ? "R$ •••••" : brl(value);
  }
  const categoryColor = (name: string) => categoryColorFor(state, name);
  const isPending = (transaction: Transaction) => isPendingTransaction(state, transaction);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Descrição</TableHead>
          <TableHead className="hide-small">Data</TableHead>
          {!compact && <TableHead className="hide-small">Conta</TableHead>}
          <TableHead className="text-right">Valor</TableHead>
          {!compact && <TableHead className="text-right">Ações</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((transaction) => (
          <TableRow key={transaction.id}>
            <TableCell>
              <div className="transaction-name">
                <CategoryIcon
                  category={transaction.category}
                  color={categoryColor(transaction.category)}
                />
                <div>
                  <strong>
                    {transaction.title}
                    {(transaction.installments ?? 1) > 1 &&
                      ` · ${transaction.installment}/${transaction.installments}`}
                  </strong>
                  <span>
                    {transaction.category}
                    {transaction.subcategory
                      ? ` · ${transaction.subcategory}`
                      : ""}
                    {isPending(transaction) && (
                      <em>
                        {" "}
                        ·{" "}
                        {state.accounts.find(
                          (account) => account.id === transaction.accountId,
                        )?.kind === "credit"
                          ? "Na fatura"
                          : "Pendente"}
                      </em>
                    )}
                  </span>
                </div>
              </div>
            </TableCell>
            <TableCell className="hide-small metadata">
              {shortDate(transaction.date)}
            </TableCell>
            {!compact && (
              <TableCell className="hide-small metadata">
                {
                  state.accounts.find(
                    (account) => account.id === transaction.accountId,
                  )?.name
                }
              </TableCell>
            )}
            <TableCell
              className={`amount text-right ${transaction.type === "income" ? "income" : ""}`}
            >
              {transaction.type === "income"
                ? "+"
                : transaction.type === "expense"
                  ? "−"
                  : ""}{" "}
              {displayMoney(transaction.amount)}
            </TableCell>
            {!compact && (
              <TableCell>
                <div className="row-actions">
                  {(transaction.installments ?? 1) === 1 && (
                    <button
                      className="icon-button"
                      aria-label={`Editar ${transaction.title}`}
                      onClick={() => openEditor("transactions", transaction)}
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  <button
                    className="icon-button"
                    aria-label={`Excluir ${transaction.title}`}
                    onClick={() =>
                      askDelete(
                        "transactions",
                        transaction.id,
                        transaction.title,
                      )
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
