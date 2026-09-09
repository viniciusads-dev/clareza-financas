"use client";
import { type CSSProperties, type ReactNode } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Eye, EyeOff, Info, Leaf, Plus, ShieldCheck } from "lucide-react";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { Toaster } from "@/components/ui/sonner";

import { addMonths } from "@/shared/finance";
import { type AuthUser } from "@/frontend/api";

import { monthLabel } from "@/frontend/finance/presentation";
import type { FormKind, PageProps } from "@/frontend/finance/types";
import type { View } from "@/frontend/finance/types";
import { nav } from "@/frontend/finance/navigation";
import Navigation from "./Navigation";
export default function FinanceLayout({ view, setView, focus, hidden, preference, user, signOut, month, setMonth, demo, start, openEditor, children, dialogs }: { view: View; setView: (view: View) => void; focus: boolean; hidden: boolean; preference: PageProps["preference"]; user: AuthUser; signOut: () => Promise<void>; month: string; setMonth: (month: string) => void; demo: boolean; start: () => void; openEditor: PageProps["openEditor"]; children: ReactNode; dialogs: ReactNode }) {
const actionKind: FormKind =
    view === "accounts"
      ? "accounts"
      : view === "budgets"
        ? "budgets"
        : view === "goals"
          ? "goals"
          : view === "categories"
            ? "categories"
            : view === "agenda"
              ? "recurrences"
              : "transactions";
  const actionLabel =
    actionKind === "accounts"
      ? "Nova conta"
      : actionKind === "budgets"
        ? "Novo orçamento"
        : actionKind === "goals"
          ? "Nova meta"
          : actionKind === "categories"
            ? "Nova categoria"
            : actionKind === "recurrences"
              ? "Nova recorrência"
              : "Novo lançamento";
  const pageDescription =
    view === "overview"
      ? "Um pequeno registro hoje faz diferença amanhã."
      : view === "transactions"
        ? "Cada movimento conta. Registre, revise e siga em frente."
        : view === "agenda"
          ? "Veja o que pede atenção agora e o que vem pela frente."
          : view === "accounts"
            ? "Todas as suas contas e cartões, lado a lado."
            : view === "budgets"
              ? "Dê um destino ao seu dinheiro, sem rigidez."
              : view === "goals"
                ? "Transforme planos em pequenas conquistas."
                : "Deixe sua linguagem financeira com a sua cara.";
  return (
    <SidebarProvider style={{ "--sidebar-width": "235px" } as CSSProperties}>
      <Navigation
        view={view}
        onNav={setView}
        focus={focus}
        setFocus={(value) => preference("focus", value)}
        user={user}
        onLogout={() => void signOut()}
      />
      <div
        className={`workspace ${focus ? "focus-mode" : ""} ${hidden ? "privacy-mode" : ""}`}
      >
        <header className="topbar">
          <div className="breadcrumb">
            <SidebarTrigger className="mobile-menu" />
            <span>Meu espaço</span>
            <ChevronRight size={14} />
            <strong>{nav.find((item) => item[0] === view)?.[1]}</strong>
          </div>
          <div className="top-actions">
            <span className="private-label">
              <ShieldCheck size={15} /> Espaço privado
            </span>
            <button
              className="icon-button"
              onClick={() => preference("hidden", !hidden)}
              aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
            >
              {hidden ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
            <span className="top-avatar">
              {user.name.trim().slice(0, 2).toUpperCase() || "EU"}
            </span>
          </div>
        </header>
        <main className="main-content">
          <div className="page-title">
            <div>
              <span className="eyebrow">
                {view === "overview"
                  ? "MENOS RUÍDO. MAIS CLAREZA."
                  : "SEU DINHEIRO, ORGANIZADO"}
              </span>
              <h1>
                {view === "overview"
                  ? "Seu dinheiro, no seu ritmo."
                  : nav.find((item) => item[0] === view)?.[1]}
              </h1>
              <p>{pageDescription}</p>
            </div>
            <div className="title-actions">
              <div className="month-picker">
                <button
                  aria-label="Mês anterior"
                  onClick={() =>
                    setMonth(addMonths(`${month}-01`, -1).slice(0, 7))
                  }
                >
                  <ChevronLeft size={17} />
                </button>
                <span>{monthLabel(month)}</span>
                <button
                  aria-label="Próximo mês"
                  onClick={() =>
                    setMonth(addMonths(`${month}-01`, 1).slice(0, 7))
                  }
                >
                  <ChevronRight size={17} />
                </button>
              </div>
              <button
                className="primary-button"
                onClick={() => (demo ? start() : openEditor(actionKind))}
              >
                <Plus size={19} />
                {actionLabel}
              </button>
            </div>
          </div>
          {demo && (
            <div className="demo-banner">
              <span>
                <Info size={16} />
                <strong>Você está explorando um exemplo.</strong> Estes valores
                são fictícios.
              </span>
              <button onClick={start}>
                Começar minhas finanças <ArrowRight size={16} />
              </button>
            </div>
          )}
          {children}
        </main>
        <footer className="page-footer">
          <span>
            <Leaf size={14} /> Feito para a vida real.
          </span>
          <span>Um passo de cada vez.</span>
        </footer>
      </div>

      {dialogs}
      <Toaster position="bottom-right" richColors />
    </SidebarProvider>
  );
}
