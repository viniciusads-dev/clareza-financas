import type { UiSession } from "./types";

// Retain drafts across page unmounts without subscribing the app to keystrokes.
// A fresh instance is created for each authenticated FinanceApp mount.
export function createUiSession() {
  let quick = "";
  let transactions: UiSession["transactions"] = { search: "", filter: "all", page: 1 };
  return {
    getQuick: () => quick,
    setQuick: (value: string) => { quick = value; },
    getTransactions: () => transactions,
    setTransactions: (value: UiSession["transactions"]) => { transactions = value; },
  };
}
