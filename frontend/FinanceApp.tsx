"use client";
import { lazy, Suspense, useCallback, useState } from "react";
import { today } from "@/shared/finance";
import { toast } from "sonner";
import { logout as authLogout, type AuthUser } from "./api";
import FinanceLayout from "./components/finance/FinanceLayout";
import PageLoading from "./components/finance/PageLoading";
import { createEditor } from "./finance/editor";
import type { Deletion, Editor, PageProps, View } from "./finance/types";
import { createUiSession } from "./finance/ui-session";
import { useFinanceData } from "./hooks/useFinanceData";

const pages = {
  overview: lazy(() => import("./pages/OverviewPage")),
  transactions: lazy(() => import("./pages/TransactionsPage")),
  agenda: lazy(() => import("./pages/AgendaPage")),
  accounts: lazy(() => import("./pages/AccountsPage")),
  budgets: lazy(() => import("./pages/BudgetsPage")),
  goals: lazy(() => import("./pages/GoalsPage")),
  categories: lazy(() => import("./pages/CategoriesPage")),
};
const EditorDialog = lazy(() => import("./dialogs/EditorDialog"));
const OnboardingDialog = lazy(() => import("./dialogs/OnboardingDialog"));
const DeleteDialog = lazy(() => import("./dialogs/DeleteDialog"));
function readPreference(which: "focus" | "hidden") {
  try { return typeof window !== "undefined" && localStorage.getItem(`clareza-${which}`) === "true"; }
  catch { return false; }
}
export default function FinanceApp({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [view, setView] = useState<View>("overview");
  const [month, setMonth] = useState(today().slice(0, 7));
  const [focus, setFocus] = useState(() => readPreference("focus"));
  const [hidden, setHidden] = useState(() => readPreference("hidden"));
  const { state, real, demo, setDemo, loading, loadError, refresh } = useFinanceData(month);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deletion, setDeletion] = useState<Deletion | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [quickVersion, setQuickVersion] = useState(0);
  // Non-reactive navigation cache. Input edits update only the owning component.
  // The cache is discarded with the authenticated app on logout.
  const [uiSession] = useState(createUiSession);
  const start = useCallback(() => setOnboardingOpen(true), []);
  const openEditor = useCallback<PageProps["openEditor"]>((kind, record, extra) => {
    if (demo) {
      toast("Comece cadastrando sua primeira conta para personalizar o espaço.", { action: { label: "Começar", onClick: start } });
      return;
    }
    setEditor(createEditor(real, month, kind, record, extra));
  }, [demo, real, month, start]);
  const askDelete = useCallback<PageProps["askDelete"]>((kind, id, name) => {
    if (demo) { toast("Os dados desta prévia são fictícios."); return; }
    setDeletion({ kind, id, name });
  }, [demo]);
  const preference = useCallback<PageProps["preference"]>((which, value) => {
    if (which === "focus") setFocus(value); else setHidden(value);
    try { localStorage.setItem(`clareza-${which}`, String(value)); }
    catch { /* preferências são opcionais */ }
  }, []);
  const signOut = useCallback(async () => {
    try { await authLogout(); onLogout(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível sair agora."); }
  }, [onLogout]);
  const onSaved = useCallback(() => {
    uiSession.setQuick("");
    setQuickVersion(version => version + 1);
  }, [uiSession]);
  const Page = pages[view];
  return (
    <FinanceLayout {...{ view, setView, focus, hidden, preference, user, signOut, month, setMonth, demo, start, openEditor }}
      dialogs={<Suspense fallback={<span role="status" className="sr-only">Carregando formulário…</span>}>
        {editor && <EditorDialog initial={editor} state={state} refresh={refresh} onClose={() => setEditor(null)} onSaved={onSaved} />}
        {onboardingOpen && <OnboardingDialog refresh={refresh} onClose={() => setOnboardingOpen(false)} onComplete={() => setDemo(false)} />}
        {deletion && <DeleteDialog deletion={deletion} refresh={refresh} onClose={() => setDeletion(null)} />}
      </Suspense>}>
      {loadError ? (
        <div className="error-card" role="alert">
          <h2>Não conseguimos carregar suas finanças.</h2><p>{loadError}</p>
          <button className="primary-button" onClick={() => void refresh()}>Tentar novamente</button>
          <button type="button" onClick={() => void signOut()} className="text-button">Voltar para entrar</button>
        </div>
      ) : loading ? <PageLoading /> : (
        <Suspense fallback={<PageLoading />}>
          <Page {...{ state, month, hidden, focus, demo, openEditor, askDelete, setView, start, preference, uiSession, quickVersion }} />
        </Suspense>
      )}
    </FinanceLayout>
  );
}
