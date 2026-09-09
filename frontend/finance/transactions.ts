
import { type State, type Transaction } from "@/shared/finance";

import { isPendingTransaction } from "@/frontend/finance/presentation";

export function filterTransactions(state: State, transactions: Transaction[], search: string, filter: string) {
const isPending = (transaction: Transaction) => isPendingTransaction(state, transaction); return [...transactions]
    .filter(
      (transaction) =>
        (filter === "all" ||
          (filter === "pending" && isPending(transaction)) ||
          transaction.type === filter) &&
        `${transaction.title} ${transaction.category} ${transaction.subcategory ?? ""}`
          .toLocaleLowerCase()
          .includes(search.toLocaleLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
}
