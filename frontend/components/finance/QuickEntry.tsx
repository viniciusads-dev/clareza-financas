"use client";
import type { PageProps } from "@/frontend/finance/types";
import { ArrowRight, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
export default function QuickEntry({ openEditor, uiSession }: Pick<PageProps, "openEditor" | "uiSession">) {
  const [quick, setQuickValue] = useState(uiSession.getQuick);
  function setQuick(value: string) {
    uiSession.setQuick(value);
    setQuickValue(value);
  }
  function parseQuick(event: FormEvent) {
    event.preventDefault();
    const match = quick.trim().match(/^(.*?)\s+(\d+(?:[.,]\d{1,2})?)$/);
    if (!match) {
      toast("Digite descrição e valor, como “Café 12,50”.");
      return;
    }
    const title = match[1];
    const category = /café|cafe|mercado|almoço|almoco|jantar|lanche/i.test(
      title,
    )
      ? "Alimentação"
      : /uber|ônibus|onibus|gasolina/i.test(title)
        ? "Transporte"
        : /farmácia|farmacia|academia/i.test(title)
          ? "Saúde"
          : "Outros";
    openEditor("transactions", undefined, {
      title,
      amount: match[2],
      category,
    });
  }
  return (<section className="quick-entry">
    <span className="quick-icon">
      <Plus size={20} />
    </span>
    <div>
      <strong>Registro rápido</strong>
      <span>Digite uma descrição e um valor</span>
    </div>
    <form onSubmit={parseQuick}>
      <input
        value={quick}
        onChange={(event) => setQuick(event.target.value)}
        placeholder="Ex.: café 12,50"
        aria-label="Registro rápido"
      />
      <button type="submit">
        Adicionar <ArrowRight size={15} />
      </button>
    </form>
  </section>);
}
