"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight, Check, LoaderCircle, ShieldCheck, Target, TrendingUp } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

import { addMonths, colors, money, today } from "@/shared/finance";
import { mutate } from "@/frontend/api";

import { toast } from "sonner";

import type { OnboardingData } from "@/frontend/finance/types";

import Picker from "@/frontend/components/finance/Picker";

export default function OnboardingDialog({ refresh, onClose, onComplete }: { refresh: () => Promise<void>; onClose: () => void; onComplete: () => void }) {
const [saving, setSaving] = useState(false); const [onboardingStep, setOnboardingStep] = useState(1); const [onboardingError, setOnboardingError] = useState(""); const [onboarding, setOnboarding] = useState<OnboardingData>({ accountName: "Conta principal", accountKind: "checking", opening: "", income: "", goalName: "", goalTarget: "", goalDate: addMonths(today(), 6) });
  function updateOnboarding(key: keyof OnboardingData, value: string) {
    setOnboarding((current) => ({ ...current, [key]: value }));
    setOnboardingError("");
  }
  async function finishOnboarding(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setOnboardingError("");
    setSaving(true);
    try {
      if (!onboarding.accountName.trim())
        throw new Error("Informe o nome da sua primeira conta.");
      const accountResult = await mutate(
        "accounts",
        "POST",
        {
          name: onboarding.accountName,
          kind: onboarding.accountKind,
          opening: money(onboarding.opening || "0"),
          color: colors[0],
          limit: 0,
          closing: 5,
          due: 12,
        },
        crypto.randomUUID(),
      );
      if (!accountResult.id)
        throw new Error("Não conseguimos criar sua primeira conta.");
      if (onboarding.income.trim())
        await mutate(
          "incomePlans",
          "POST",
          {
            title: "Renda mensal",
            amount: money(onboarding.income),
            startMonth: today().slice(0, 7),
            active: false,
            automatic: false,
            businessDayRule: "previous_business_day",
          },
          crypto.randomUUID(),
        );
      if (onboarding.goalName.trim() || onboarding.goalTarget.trim()) {
        if (!onboarding.goalName.trim() || !onboarding.goalTarget.trim())
          throw new Error(
            "Preencha o nome e o valor da meta, ou deixe os dois campos vazios.",
          );
        await mutate(
          "goals",
          "POST",
          {
            name: onboarding.goalName,
            target: money(onboarding.goalTarget),
            saved: 0,
            date: onboarding.goalDate,
            color: colors[1],
          },
          crypto.randomUUID(),
        );
      }
      onClose();
      onComplete();
      toast.success("Seu espaço está pronto. Vamos dar o próximo passo!");
      await refresh();
    } catch (error) {
      setOnboardingError(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir o cadastro inicial.",
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
    <DialogContent className="onboarding-dialog">
      <DialogHeader>
        <span className="modal-kicker">SEU PRIMEIRO PASSO</span>
        <DialogTitle>Vamos deixar tudo mais claro</DialogTitle>
        <DialogDescription>
          Em três passos rápidos, você cria um ponto de partida para suas
          finanças.
        </DialogDescription>
      </DialogHeader>
      <div className="onboarding-progress">
        <div>
          <span>Passo {onboardingStep} de 3</span>
          <strong>
            {onboardingStep === 1
              ? "Seu ponto de partida"
              : onboardingStep === 2
                ? "Sua renda"
                : "Um plano para guardar"}
          </strong>
        </div>
        <Progress value={(onboardingStep / 3) * 100} />
      </div>
      <form
        onSubmit={
          onboardingStep === 3
            ? finishOnboarding
            : (event) => {
              event.preventDefault();
              setOnboardingStep((step) => step + 1);
            }
        }
        className="onboarding-form"
      >
        {onboardingStep === 1 && (
          <>
            <label className="field">
              <span>Como você chama sua primeira conta?</span>
              <input
                autoFocus
                required
                value={onboarding.accountName}
                onChange={(event) =>
                  updateOnboarding("accountName", event.target.value)
                }
                placeholder="Ex.: conta principal"
              />
            </label>
            <Picker
              label="Tipo de conta"
              value={onboarding.accountKind}
              onChange={(value) => updateOnboarding("accountKind", value)}
              options={[
                { value: "checking", label: "Conta bancária" },
                { value: "cash", label: "Dinheiro / carteira" },
              ]}
            />
            <label className="field">
              <span>
                Quanto você tem disponível hoje? <small>(opcional)</small>
              </span>
              <input
                inputMode="decimal"
                value={onboarding.opening}
                onChange={(event) =>
                  updateOnboarding("opening", event.target.value)
                }
                placeholder="0,00"
              />
            </label>
          </>
        )}
        {onboardingStep === 2 && (
          <>
            <div className="onboarding-tip">
              <TrendingUp size={21} />
              <div>
                <strong>Não precisa ser perfeito.</strong>
                <p>
                  Uma estimativa de renda mensal já ajuda a projetar seus
                  próximos compromissos.
                </p>
                <p>
                  Esse valor fica apenas no planejamento e não altera o
                  saldo. Você poderá ativar o recebimento automático na
                  Agenda.
                </p>
              </div>
            </div>
            <label className="field">
              <span>
                Qual é sua renda mensal? <small>(opcional)</small>
              </span>
              <div className="amount-input">
                <div>
                  <span>R$</span>
                  <input
                    autoFocus
                    inputMode="decimal"
                    value={onboarding.income}
                    onChange={(event) =>
                      updateOnboarding("income", event.target.value)
                    }
                    placeholder="0,00"
                  />
                </div>
              </div>
            </label>
          </>
        )}
        {onboardingStep === 3 && (
          <>
            <div className="onboarding-tip">
              <Target size={21} />
              <div>
                <strong>Ter um motivo ajuda a continuar.</strong>
                <p>
                  Se quiser, crie uma meta agora. Você poderá editar depois.
                </p>
              </div>
            </div>
            <label className="field">
              <span>
                O que você quer conquistar? <small>(opcional)</small>
              </span>
              <input
                autoFocus
                value={onboarding.goalName}
                onChange={(event) =>
                  updateOnboarding("goalName", event.target.value)
                }
                placeholder="Ex.: reserva de emergência"
              />
            </label>
            <div className="form-grid">
              <label className="field">
                <span>
                  Valor da meta <small>(opcional)</small>
                </span>
                <input
                  inputMode="decimal"
                  value={onboarding.goalTarget}
                  onChange={(event) =>
                    updateOnboarding("goalTarget", event.target.value)
                  }
                  placeholder="10.000,00"
                />
              </label>
              <label className="field">
                <span>Prazo</span>
                <input
                  type="date"
                  value={onboarding.goalDate}
                  onChange={(event) =>
                    updateOnboarding("goalDate", event.target.value)
                  }
                />
              </label>
            </div>
          </>
        )}
        {onboardingError && (
          <p className="form-error" role="alert">
            {onboardingError}
          </p>
        )}
        <div className="form-footer">
          <button
            type="button"
            className="secondary-button"
            disabled={saving}
            onClick={() =>
              onboardingStep === 1
                ? onClose()
                : setOnboardingStep((step) => step - 1)
            }
          >
            {onboardingStep === 1 ? "Agora não" : "Voltar"}
          </button>
          <button
            className="primary-button"
            disabled={saving}
            type="submit"
          >
            {saving ? (
              <LoaderCircle className="spin" size={17} />
            ) : onboardingStep === 3 ? (
              <Check size={17} />
            ) : (
              <ArrowRight size={17} />
            )}{" "}
            {saving
              ? "Preparando…"
              : onboardingStep === 3
                ? "Entrar no meu espaço"
                : "Continuar"}
          </button>
        </div>
        <p className="form-reassurance">
          <ShieldCheck size={14} /> Seus registros ficam no seu espaço
          privado.
        </p>
      </form>
    </DialogContent>
  </Dialog>);
}
