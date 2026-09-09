"use client";
import { useState, type FormEvent } from "react";
import { Check, LoaderCircle, ShieldCheck } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { money, type State } from "@/shared/finance";
import { mutate } from "@/frontend/api";

import { toast } from "sonner";

import { splitIds, incomeCategories, expenseCategories } from "@/frontend/finance/presentation";
import type { Editor } from "@/frontend/finance/types";

import Picker from "@/frontend/components/finance/Picker";
import TagPicker from "@/frontend/components/finance/TagPicker";

export default function EditorDialog({ initial, state, refresh, onClose, onSaved }: { initial: Editor; state: State; refresh: () => Promise<void>; onClose: () => void; onSaved: () => void }) {
  const [editor, setEditor] = useState(initial); const [saving, setSaving] = useState(false); const [formError, setFormError] = useState("");
  const topLevelCategories = (type: "expense" | "income") => [
    ...(type === "income" ? incomeCategories : expenseCategories).map(
      (name) => ({ value: name, label: name }),
    ),
    ...state.categories
      .filter((category) => category.type === type && !category.parentId)
      .map((category) => ({ value: category.name, label: category.name })),
  ];
  const subcategoriesFor = (categoryName: string) => {
    const parent = state.categories.find(
      (category) => category.name === categoryName && !category.parentId,
    );
    return parent
      ? state.categories
        .filter((category) => category.parentId === parent.id)
        .map((category) => ({ value: category.name, label: category.name }))
      : [];
  };
  function field(key: string, value: string) {
    setEditor((current) =>
      current
        ? { ...current, values: { ...current.values, [key]: value } }
        : current,
    );
    setFormError("");
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editor || saving) return;
    setFormError("");
    setSaving(true);
    try {
      const values = editor.values;
      let data: unknown;
      if (editor.kind === "accounts")
        data = {
          name: values.name,
          kind: values.kind,
          opening: money(values.opening || "0"),
          color: values.color,
          limit: money(values.limit || "0"),
          closing: Number(values.closing),
          due: Number(values.due),
        };
      else if (editor.kind === "transactions")
        data = {
          title: values.title,
          amount: money(values.amount),
          type: values.type,
          category:
            values.type === "transfer" ? "Transferência" : values.category,
          ...(values.subcategory ? { subcategory: values.subcategory } : {}),
          ...(splitIds(values.tags).length
            ? { tags: splitIds(values.tags) }
            : {}),
          accountId: values.accountId,
          ...(values.type === "transfer"
            ? { toId: values.toId, invoiceMonth: values.invoiceMonth }
            : {}),
          date: values.date,
          status: values.type === "transfer" ? "paid" : values.status,
          installments: Number(values.installments),
        };
      else if (editor.kind === "budgets")
        data = {
          category: values.category,
          amount: money(values.amount),
          month: values.month,
        };
      else if (editor.kind === "goals")
        data = {
          name: values.name,
          target: money(values.target),
          saved: money(values.saved),
          date: values.date,
          color: values.color,
        };
      else if (editor.kind === "recurrences")
        data = {
          title: values.title,
          amount: money(values.amount),
          type: values.type,
          category: values.category,
          ...(values.subcategory ? { subcategory: values.subcategory } : {}),
          ...(splitIds(values.tags).length
            ? { tags: splitIds(values.tags) }
            : {}),
          accountId: values.accountId,
          startDate: values.startDate,
          nextDate: values.nextDate,
          frequency: values.frequency,
          ...(values.endDate ? { endDate: values.endDate } : {}),
          active: values.active === "true",
        };
      else if (editor.kind === "incomePlans")
        data = {
          title: values.title,
          amount: money(values.amount),
          ...(values.automatic === "true"
            ? {
              accountId: values.accountId,
              dayOfMonth: Number(values.dayOfMonth),
              ...(values.nextPeriod
                ? { nextPeriod: values.nextPeriod }
                : {}),
            }
            : {}),
          startMonth: values.startMonth,
          active: values.automatic === "true" && values.active === "true",
          automatic: values.automatic === "true",
          businessDayRule: "previous_business_day",
        };
      else if (editor.kind === "categories")
        data = {
          name: values.name,
          type: values.type,
          ...(values.parentId ? { parentId: values.parentId } : {}),
          color: values.color,
        };
      else data = { name: values.name, color: values.color };
      await mutate(
        editor.kind,
        editor.id ? "PUT" : "POST",
        data,
        crypto.randomUUID(),
        editor.id,
      );
      onClose();
      onSaved();
      toast.success(
        editor.kind === "recurrences"
          ? "Recorrência salva."
          : editor.kind === "incomePlans"
            ? "Agendamento de renda salvo."
            : "Salvo. Mais um passo dado!",
      );
      await refresh();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (<Dialog
    open
    onOpenChange={(open) => {
      if (!open && !saving) onClose();
    }}
  >
    <DialogContent className="editor-dialog">
      <DialogHeader>
        <span className="modal-kicker">SEU PRÓXIMO PEQUENO PASSO</span>
        <DialogTitle>
          {editor?.id
            ? "Editar "
            : editor?.kind === "transactions"
              ? "Novo "
              : editor?.kind === "accounts"
                ? "Nova "
                : "Novo "}
          {editor?.kind === "transactions"
            ? "lançamento"
            : editor?.kind === "accounts"
              ? "conta ou cartão"
              : editor?.kind === "budgets"
                ? "orçamento"
                : editor?.kind === "goals"
                  ? "objetivo"
                  : editor?.kind === "recurrences"
                    ? "lançamento recorrente"
                    : editor?.kind === "incomePlans"
                      ? "recebimento automático"
                      : editor?.kind === "categories"
                        ? "categoria"
                        : "tag"}
        </DialogTitle>
        <DialogDescription>
          {editor?.kind === "transactions"
            ? "Confira os detalhes e pronto. Não precisa complicar."
            : editor?.kind === "recurrences"
              ? "O Clareza cuidará dos próximos lançamentos para você."
              : editor?.kind === "incomePlans"
                ? "A renda só altera o saldo quando o recebimento automático estiver ativo."
                : editor?.kind === "categories"
                  ? "Crie uma categoria ou transforme-a em subcategoria."
                  : editor?.kind === "tags"
                    ? "Use uma palavra curta para encontrar padrões depois."
                    : editor?.kind === "accounts"
                      ? "Use o saldo atual como ponto de partida."
                      : editor?.kind === "goals"
                        ? "Um nome, um valor e algo para conquistar."
                        : "Escolha uma categoria e um limite para o mês."}
        </DialogDescription>
      </DialogHeader>
      {editor && (
        <form onSubmit={save} className="editor-form">
          {editor.kind === "transactions" && (
            <>
              <Tabs
                value={editor.values.type}
                onValueChange={(value) => {
                  field("type", value);
                  if (value === "transfer") {
                    field("installments", "1");
                    field("status", "paid");
                  }
                  if (value === "income") {
                    field("category", "Salário");
                    field("installments", "1");
                  }
                }}
              >
                <TabsList className="w-full">
                  <TabsTrigger value="expense">Despesa</TabsTrigger>
                  <TabsTrigger value="income">Receita</TabsTrigger>
                  <TabsTrigger value="transfer">Transferência</TabsTrigger>
                </TabsList>
              </Tabs>
              <label className="amount-input field">
                <span>
                  {Number(editor.values.installments) > 1
                    ? "Valor total da compra"
                    : "Quanto?"}
                </span>
                <div>
                  <span>R$</span>
                  <input
                    autoFocus
                    required
                    inputMode="decimal"
                    value={editor.values.amount}
                    onChange={(event) =>
                      field("amount", event.target.value)
                    }
                    placeholder="0,00"
                    aria-label="Valor"
                  />
                </div>
              </label>
              <label className="field">
                <span>Descrição</span>
                <input
                  required
                  maxLength={100}
                  value={editor.values.title}
                  onChange={(event) => field("title", event.target.value)}
                  placeholder="Ex.: almoço, mercado, salário"
                />
              </label>
              <div className="form-grid">
                <Picker
                  label={
                    editor.values.type === "transfer"
                      ? "Conta de origem"
                      : "Conta ou cartão"
                  }
                  value={editor.values.accountId}
                  onChange={(value) => {
                    field("accountId", value);
                    field("installments", "1");
                    if (
                      state.accounts.find((account) => account.id === value)
                        ?.kind === "credit"
                    )
                      field("status", "pending");
                  }}
                  options={state.accounts
                    .filter(
                      (account) =>
                        editor.values.type === "expense" ||
                        account.kind !== "credit",
                    )
                    .map((account) => ({
                      value: account.id,
                      label: account.name,
                    }))}
                />
                {editor.values.type === "transfer" ? (
                  <Picker
                    label="Conta de destino"
                    value={editor.values.toId}
                    onChange={(value) => field("toId", value)}
                    options={state.accounts
                      .filter(
                        (account) => account.id !== editor.values.accountId,
                      )
                      .map((account) => ({
                        value: account.id,
                        label: account.name,
                      }))}
                    allowEmpty
                  />
                ) : (
                  <Picker
                    label="Categoria"
                    value={editor.values.category}
                    onChange={(value) => {
                      field("category", value);
                      field("subcategory", "");
                    }}
                    options={topLevelCategories(
                      editor.values.type === "income"
                        ? "income"
                        : "expense",
                    )}
                  />
                )}
                <label className="field">
                  <span>
                    {editor.id &&
                      state.accounts.find(
                        (account) => account.id === editor.values.accountId,
                      )?.kind === "credit"
                      ? "Vencimento da parcela"
                      : "Data"}
                  </span>
                  <input
                    type="date"
                    required
                    value={editor.values.date}
                    onChange={(event) => field("date", event.target.value)}
                  />
                </label>
                {editor.values.type !== "transfer" &&
                  (state.accounts.find(
                    (account) => account.id === editor.values.accountId,
                  )?.kind === "credit" ? (
                    <label className="field">
                      <span>
                        Parcelas{" "}
                        {editor.id ? "(nova compra para parcelar)" : ""}
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="48"
                        disabled={!!editor.id}
                        required
                        value={editor.values.installments}
                        onChange={(event) =>
                          field("installments", event.target.value)
                        }
                      />
                    </label>
                  ) : (
                    <Picker
                      label="Situação"
                      value={editor.values.status}
                      onChange={(value) => field("status", value)}
                      options={[
                        {
                          value: "paid",
                          label:
                            editor.values.type === "income"
                              ? "Recebido"
                              : "Pago",
                        },
                        {
                          value: "pending",
                          label:
                            editor.values.type === "income"
                              ? "A receber"
                              : "A pagar",
                        },
                      ]}
                    />
                  ))}
              </div>
              {editor.values.type !== "transfer" &&
                subcategoriesFor(editor.values.category).length > 0 && (
                  <Picker
                    label="Subcategoria"
                    value={editor.values.subcategory}
                    onChange={(value) => field("subcategory", value)}
                    options={subcategoriesFor(editor.values.category)}
                    allowEmpty
                  />
                )}
              {editor.values.type !== "transfer" &&
                state.tags.length > 0 && (
                  <TagPicker
                    tags={state.tags}
                    value={editor.values.tags}
                    onChange={(value) => field("tags", value)}
                  />
                )}
              {editor.values.type === "transfer" &&
                state.accounts.find(
                  (account) => account.id === editor.values.toId,
                )?.kind === "credit" && (
                  <label className="field">
                    <span>Fatura que estou pagando</span>
                    <input
                      type="month"
                      required
                      value={editor.values.invoiceMonth}
                      onChange={(event) =>
                        field("invoiceMonth", event.target.value)
                      }
                    />
                  </label>
                )}
              {!state.accounts.length && (
                <p className="form-warning">
                  Cadastre uma conta na seção “Contas e cartões” antes de
                  lançar.
                </p>
              )}
              {state.accounts.find(
                (account) => account.id === editor.values.accountId,
              )?.kind === "credit" && (
                  <p className="form-hint">
                    Compras a partir do dia de fechamento entram na próxima
                    fatura. O valor total será dividido entre as parcelas.
                  </p>
                )}
            </>
          )}
          {editor.kind === "incomePlans" && (
            <>
              <label className="amount-input field">
                <span>Valor mensal planejado</span>
                <div>
                  <span>R$</span>
                  <input
                    autoFocus
                    required
                    inputMode="decimal"
                    value={editor.values.amount}
                    onChange={(event) =>
                      field("amount", event.target.value)
                    }
                    placeholder="0,00"
                  />
                </div>
              </label>
              <label className="field">
                <span>Descrição</span>
                <input
                  required
                  maxLength={100}
                  value={editor.values.title}
                  onChange={(event) => field("title", event.target.value)}
                  placeholder="Ex.: salário, pró-labore"
                />
              </label>
              <div className="form-grid">
                <label className="field">
                  <span>Dia fixo do recebimento</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required={editor.values.automatic === "true"}
                    value={editor.values.dayOfMonth}
                    onChange={(event) =>
                      field("dayOfMonth", event.target.value)
                    }
                  />
                </label>
                <label className="field">
                  <span>Começa em</span>
                  <input
                    type="month"
                    required
                    value={editor.values.startMonth}
                    onChange={(event) =>
                      field("startMonth", event.target.value)
                    }
                  />
                </label>
              </div>
              <Picker
                label="Conta de destino"
                value={editor.values.accountId}
                onChange={(value) => field("accountId", value)}
                options={state.accounts
                  .filter((account) => account.kind !== "credit")
                  .map((account) => ({
                    value: account.id,
                    label: account.name,
                  }))}
                allowEmpty
              />
              <Picker
                label="Automação"
                value={editor.values.automatic}
                onChange={(value) => {
                  field("automatic", value);
                  field("active", value === "true" ? "true" : "false");
                }}
                options={[
                  { value: "false", label: "Só planejamento" },
                  { value: "true", label: "Lançar automaticamente" },
                ]}
              />
              {editor.values.automatic === "true" && (
                <Picker
                  label="Status"
                  value={editor.values.active}
                  onChange={(value) => field("active", value)}
                  options={[
                    { value: "true", label: "Ativo" },
                    { value: "false", label: "Pausado" },
                  ]}
                />
              )}
              <p className="form-hint">
                Se o dia cair em fim de semana ou feriado do calendário
                brasileiro, o lançamento será antecipado para o último dia
                útil anterior.
              </p>
            </>
          )}
          {editor.kind === "recurrences" && (
            <>
              <label className="amount-input field">
                <span>Valor recorrente</span>
                <div>
                  <span>R$</span>
                  <input
                    autoFocus
                    required
                    inputMode="decimal"
                    value={editor.values.amount}
                    onChange={(event) =>
                      field("amount", event.target.value)
                    }
                    placeholder="0,00"
                  />
                </div>
              </label>
              <label className="field">
                <span>Descrição</span>
                <input
                  required
                  maxLength={100}
                  value={editor.values.title}
                  onChange={(event) => field("title", event.target.value)}
                  placeholder="Ex.: aluguel, salário, streaming"
                />
              </label>
              <Tabs
                value={editor.values.type}
                onValueChange={(value) => {
                  field("type", value);
                  field(
                    "category",
                    value === "income" ? "Salário" : "Moradia",
                  );
                  field("subcategory", "");
                }}
              >
                <TabsList className="w-full">
                  <TabsTrigger value="expense">Despesa</TabsTrigger>
                  <TabsTrigger value="income">Receita</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="form-grid">
                <Picker
                  label="Conta ou cartão"
                  value={editor.values.accountId}
                  onChange={(value) => field("accountId", value)}
                  options={state.accounts.map((account) => ({
                    value: account.id,
                    label: account.name,
                  }))}
                />
                <Picker
                  label="Frequência"
                  value={editor.values.frequency}
                  onChange={(value) => field("frequency", value)}
                  options={[
                    { value: "weekly", label: "Toda semana" },
                    { value: "monthly", label: "Todo mês" },
                    { value: "yearly", label: "Todo ano" },
                  ]}
                />
              </div>
              <div className="form-grid">
                <Picker
                  label="Categoria"
                  value={editor.values.category}
                  onChange={(value) => {
                    field("category", value);
                    field("subcategory", "");
                  }}
                  options={topLevelCategories(
                    editor.values.type === "income" ? "income" : "expense",
                  )}
                />
                <label className="field">
                  <span>Primeiro lançamento</span>
                  <input
                    type="date"
                    required
                    value={editor.values.nextDate}
                    onChange={(event) => {
                      field("nextDate", event.target.value);
                      field("startDate", event.target.value);
                    }}
                  />
                </label>
              </div>
              {subcategoriesFor(editor.values.category).length > 0 && (
                <Picker
                  label="Subcategoria"
                  value={editor.values.subcategory}
                  onChange={(value) => field("subcategory", value)}
                  options={subcategoriesFor(editor.values.category)}
                  allowEmpty
                />
              )}
              {state.tags.length > 0 && (
                <TagPicker
                  tags={state.tags}
                  value={editor.values.tags}
                  onChange={(value) => field("tags", value)}
                />
              )}
              <label className="field">
                <span>
                  Repetir até <small>(opcional)</small>
                </span>
                <input
                  type="date"
                  value={editor.values.endDate}
                  onChange={(event) => field("endDate", event.target.value)}
                />
              </label>
              <Picker
                label="Estado"
                value={editor.values.active}
                onChange={(value) => field("active", value)}
                options={[
                  { value: "true", label: "Ativa" },
                  { value: "false", label: "Pausada" },
                ]}
              />
            </>
          )}
          {editor.kind === "accounts" && (
            <>
              <label className="field">
                <span>Nome da conta ou cartão</span>
                <input
                  autoFocus
                  required
                  maxLength={100}
                  value={editor.values.name}
                  onChange={(event) => field("name", event.target.value)}
                  placeholder="Ex.: conta principal"
                />
              </label>
              <Picker
                label="Tipo"
                value={editor.values.kind}
                onChange={(value) => field("kind", value)}
                options={[
                  { value: "checking", label: "Conta bancária" },
                  { value: "cash", label: "Dinheiro / carteira" },
                  { value: "credit", label: "Cartão de crédito" },
                ]}
              />
              <label className="field">
                <span>
                  {editor.values.kind === "credit"
                    ? "Saldo inicial (negativo se houver dívida)"
                    : "Saldo inicial (R$)"}
                </span>
                <input
                  required
                  inputMode="decimal"
                  value={editor.values.opening}
                  onChange={(event) => field("opening", event.target.value)}
                />
              </label>
              {editor.values.kind === "credit" && (
                <>
                  <label className="field">
                    <span>Limite do cartão (R$)</span>
                    <input
                      required
                      inputMode="decimal"
                      value={editor.values.limit}
                      onChange={(event) =>
                        field("limit", event.target.value)
                      }
                    />
                  </label>
                  <div className="form-grid">
                    <label className="field">
                      <span>Dia de fechamento</span>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        required
                        value={editor.values.closing}
                        onChange={(event) =>
                          field("closing", event.target.value)
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Dia de vencimento</span>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        required
                        value={editor.values.due}
                        onChange={(event) =>
                          field("due", event.target.value)
                        }
                      />
                    </label>
                  </div>
                </>
              )}
              <label className="field color-field">
                <span>Cor de identificação</span>
                <input
                  type="color"
                  value={editor.values.color}
                  onChange={(event) => field("color", event.target.value)}
                />
              </label>
            </>
          )}
          {editor.kind === "budgets" && (
            <>
              <Picker
                label="Categoria"
                value={editor.values.category}
                onChange={(value) => field("category", value)}
                options={topLevelCategories("expense")}
              />
              <label className="field">
                <span>Limite planejado (R$)</span>
                <input
                  autoFocus
                  required
                  inputMode="decimal"
                  value={editor.values.amount}
                  onChange={(event) => field("amount", event.target.value)}
                  placeholder="Ex.: 600,00"
                />
              </label>
              <label className="field">
                <span>Mês</span>
                <input
                  type="month"
                  required
                  value={editor.values.month}
                  onChange={(event) => field("month", event.target.value)}
                />
              </label>
            </>
          )}
          {editor.kind === "goals" && (
            <>
              <label className="field">
                <span>Nome da meta</span>
                <input
                  autoFocus
                  required
                  maxLength={100}
                  value={editor.values.name}
                  onChange={(event) => field("name", event.target.value)}
                  placeholder="Ex.: minha reserva de emergência"
                />
              </label>
              <div className="form-grid">
                <label className="field">
                  <span>Quero alcançar (R$)</span>
                  <input
                    required
                    inputMode="decimal"
                    value={editor.values.target}
                    onChange={(event) =>
                      field("target", event.target.value)
                    }
                    placeholder="10.000,00"
                  />
                </label>
                <label className="field">
                  <span>Já tenho guardado (R$)</span>
                  <input
                    required
                    inputMode="decimal"
                    value={editor.values.saved}
                    onChange={(event) => field("saved", event.target.value)}
                  />
                </label>
              </div>
              <label className="field">
                <span>Data do objetivo</span>
                <input
                  type="date"
                  required
                  value={editor.values.date}
                  onChange={(event) => field("date", event.target.value)}
                />
              </label>
              <label className="field color-field">
                <span>Cor da meta</span>
                <input
                  type="color"
                  value={editor.values.color}
                  onChange={(event) => field("color", event.target.value)}
                />
              </label>
            </>
          )}
          {editor.kind === "categories" && (
            <>
              <label className="field">
                <span>Nome</span>
                <input
                  autoFocus
                  required
                  maxLength={100}
                  value={editor.values.name}
                  onChange={(event) => field("name", event.target.value)}
                  placeholder="Ex.: Pets, Cursos, Renda extra"
                />
              </label>
              <Picker
                label="Tipo"
                value={editor.values.type}
                onChange={(value) => {
                  field("type", value);
                  field("parentId", "");
                }}
                options={[
                  { value: "expense", label: "Categoria de saída" },
                  { value: "income", label: "Categoria de entrada" },
                ]}
              />
              <Picker
                label="Categoria pai (opcional)"
                value={editor.values.parentId}
                onChange={(value) => field("parentId", value)}
                options={state.categories
                  .filter(
                    (category) =>
                      category.type === editor.values.type &&
                      !category.parentId,
                  )
                  .map((category) => ({
                    value: category.id,
                    label: category.name,
                  }))}
                allowEmpty
              />
              <label className="field color-field">
                <span>Cor</span>
                <input
                  type="color"
                  value={editor.values.color}
                  onChange={(event) => field("color", event.target.value)}
                />
              </label>
            </>
          )}
          {editor.kind === "tags" && (
            <>
              <label className="field">
                <span>Nome da tag</span>
                <input
                  autoFocus
                  required
                  maxLength={60}
                  value={editor.values.name}
                  onChange={(event) => field("name", event.target.value)}
                  placeholder="Ex.: trabalho, viagem, família"
                />
              </label>
              <label className="field color-field">
                <span>Cor</span>
                <input
                  type="color"
                  value={editor.values.color}
                  onChange={(event) => field("color", event.target.value)}
                />
              </label>
            </>
          )}
          {formError && (
            <p role="alert" className="form-error">
              {formError}
            </p>
          )}
          <div className="form-footer">
            <button
              type="button"
              className="secondary-button"
              disabled={saving}
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              className="primary-button"
              disabled={
                saving ||
                ((editor.kind === "transactions" ||
                  editor.kind === "recurrences" ||
                  editor.kind === "incomePlans") &&
                  !state.accounts.length)
              }
              type="submit"
            >
              {saving ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Check size={17} />
              )}{" "}
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
          <p className="form-reassurance">
            <ShieldCheck size={14} /> Seus registros ficam no seu espaço
            privado.
          </p>
        </form>
      )}
    </DialogContent>
  </Dialog>);
}
