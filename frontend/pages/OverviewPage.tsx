"use client";
import { memo, useMemo, type CSSProperties } from "react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Bell, CalendarDays, CheckCircle2, CircleAlert, Eye, EyeOff, Lightbulb, Plus, Sparkles, Wallet } from "lucide-react";

import { Progress } from "@/components/ui/progress";

import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { brl } from "@/shared/finance";

import { monthLabel, categoryColorFor } from "@/frontend/finance/presentation";
import type { AlertItem, PageProps } from "@/frontend/finance/types";
import Empty from "@/frontend/components/finance/Empty";

import TransactionTable from "@/frontend/components/finance/TransactionTable";
import GoalCard from "@/frontend/components/finance/GoalCard";
import AgendaRow from "@/frontend/components/finance/AgendaRow";
import QuickEntry from "@/frontend/components/finance/QuickEntry";

import { overviewModel } from "./overview-model";

function OverviewPage({ state, month, hidden, focus, openEditor, askDelete, setView, preference, uiSession, quickVersion }: Pick<PageProps, "state" | "month" | "hidden" | "focus" | "openEditor" | "askDelete" | "setView" | "preference" | "uiSession" | "quickVersion">) {
  function displayMoney(value: number) {
    return hidden ? "R$ •••••" : brl(value);
  }
  const categoryColor = (name: string) => categoryColorFor(state, name);
  const { stats, cash, cardDebt, cashPending, available, categoryData, monthlyBudgets, agendaItems, alerts, insights, chartData } = useMemo(() => overviewModel(state, month), [state, month]);
  const recentTransactions = useMemo(() => [...stats.tx].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5), [stats.tx]);
  const alertCard = (alert: AlertItem) => (
    <div className={`alert-item ${alert.tone}`} key={alert.id}>
      <span className="alert-icon">
        {alert.tone === "warning" ? (
          <CircleAlert size={17} />
        ) : (
          <CheckCircle2 size={17} />
        )}
      </span>
      <div>
        <strong>{alert.title}</strong>
        <p>{alert.detail}</p>
      </div>
    </div>
  );
  return (
    <>
      <section className="summary-grid">
        <article className="balance-card">
          <div className="card-eyebrow">
            <Wallet size={17} />
            <span>Disponível após compromissos</span>
            <button
              className="icon-button"
              onClick={() => preference("hidden", !hidden)}
              aria-label="Alternar visibilidade do saldo"
            >
              {hidden ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          <div
            className={`big-balance ${available < 0 ? "negative" : ""}`}
          >
            {displayMoney(available)}
          </div>
          <div className="balance-note">
            <span className="balance-status">
              <span />
              {available >= 0
                ? "Um panorama do que você tem hoje"
                : "Vamos reorganizar os próximos passos"}
            </span>
          </div>
          <div className="balance-bottom">
            <span>
              Saldo em contas <strong>{displayMoney(cash)}</strong>
            </span>
            <span title="Despesas pendentes e toda a dívida dos cartões.">
              Compromissos{" "}
              <strong>
                {displayMoney(cardDebt + cashPending)}
              </strong>
            </span>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon green">
            <ArrowDownLeft size={22} />
          </span>
          <span className="metric-label">Receitas do mês</span>
          <strong>{displayMoney(stats.income)}</strong>
          <p>Recebidas e previstas</p>
          <div className="metric-rule green-rule" />
          <span className="metric-foot">Tudo que entra</span>
        </article>
        <article className="metric-card">
          <span className="metric-icon orange">
            <ArrowUpRight size={22} />
          </span>
          <span className="metric-label">Despesas do mês</span>
          <strong>{displayMoney(stats.expense)}</strong>
          <p>Pagas e previstas</p>
          <div className="metric-rule orange-rule" />
          <span className="metric-foot">
            Inclui parcelas com vencimento
          </span>
        </article>
      </section>
      <QuickEntry key={quickVersion} openEditor={openEditor} uiSession={uiSession} />
      {alerts.length > 0 && (
        <section className="panel alert-panel">
          <div className="section-head">
            <div>
              <h2>
                <Bell size={17} /> Alertas para você
              </h2>
              <p>Pequenos lembretes para manter o controle.</p>
            </div>
            <span className="mini-badge">{alerts.length}</span>
          </div>
          <div className="alert-grid">
            {alerts.slice(0, 3).map(alertCard)}
          </div>
        </section>
      )}
      <div className="dashboard-grid">
        <div className="main-column">
          <section className="panel spending-panel">
            <div className="section-head">
              <div>
                <h2>Para onde foi seu dinheiro</h2>
                <p>Despesas acumuladas em {monthLabel(month)}</p>
              </div>
              <span className="mini-badge">
                {categoryData.length} categorias
              </span>
            </div>
            {categoryData.length ? (
              <div className="spending-content">
                <div className="donut-wrapper">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={68}
                        outerRadius={95}
                        paddingAngle={3}
                      >
                        {categoryData.map((category) => (
                          <Cell
                            key={category.name}
                            fill={categoryColor(category.name)}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => brl(Number(value))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-center">
                    <span>Total</span>
                    <strong>{displayMoney(stats.expense)}</strong>
                  </div>
                </div>
                <div className="category-legend">
                  {categoryData.slice(0, 5).map((category) => (
                    <div key={category.name}>
                      <span>
                        <i
                          style={{
                            background: categoryColor(
                              category.name,
                            ),
                          }}
                        />
                        {category.name}
                      </span>
                      <strong>
                        {displayMoney(category.value)}
                      </strong>
                      <small>
                        {Math.round(
                          (category.value /
                            Math.max(1, stats.expense)) *
                          100,
                        )}
                        %
                      </small>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <Empty
                title="Ainda não há gastos neste mês."
                text="Registre o próximo movimento para começar a enxergar seus padrões."
              />
            )}
          </section>
          <section className="panel chart-panel">
            <div className="section-head">
              <div>
                <h2>Fluxo do mês</h2>
                <p>Receitas e despesas acumuladas</p>
              </div>
              <div className="chart-legend">
                <span>
                  <i className="green-dot" />
                  Receitas
                </span>
                <span>
                  <i className="orange-dot" />
                  Despesas
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient
                    id="incomeFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#65b589"
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="100%"
                      stopColor="#65b589"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient
                    id="expenseFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#dba66e"
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="100%"
                      stopColor="#dba66e"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#edf1ed" />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "#9aa69b" }}
                  interval={4}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(value) =>
                    brl(Math.round(Number(value) * 100))
                  }
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#57ab7d"
                  fill="url(#incomeFill)"
                  strokeWidth={2}
                  name="Receitas"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="#d8a165"
                  fill="url(#expenseFill)"
                  strokeWidth={2}
                  name="Despesas"
                />
              </AreaChart>
            </ResponsiveContainer>
          </section>
          <section className="panel recent-panel">
            <div className="section-head">
              <div>
                <h2>Últimos lançamentos</h2>
                <p>Um olhar rápido no seu mês</p>
              </div>
              <button
                className="text-button"
                onClick={() => {
                  uiSession.setTransactions({ search: "", filter: "all", page: 1 });
                  setView("transactions");
                }}
              >
                Ver todos <ArrowRight size={15} />
              </button>
            </div>
            {stats.tx.length ? (
              <TransactionTable rows={recentTransactions} state={state} hidden={hidden} openEditor={openEditor} askDelete={askDelete} compact />
            ) : (
              <Empty
                title="Ainda sem lançamentos."
                text="Comece pelo próximo café, almoço ou pagamento."
              />
            )}
          </section>
        </div>
        <aside className="right-column">
          <section className="panel agenda">
            <div className="section-head">
              <div>
                <h2>Próximos compromissos</h2>
                <p>Até os próximos 30 dias</p>
              </div>
              <CalendarDays size={18} />
            </div>
            {agendaItems.length ? (
              agendaItems.slice(0, 4).map(item => <AgendaRow key={item.id} item={item} hidden={hidden} />)
            ) : (
              <div className="agenda-empty">
                <CheckCircle2 size={24} />
                <p>Nenhuma conta pendente por aqui.</p>
              </div>
            )}
            <button
              className="agenda-link"
              onClick={() => setView("agenda")}
            >
              Abrir agenda completa <ArrowRight size={16} />
            </button>
          </section>
          <section className="panel insights-panel">
            <div className="section-head">
              <div>
                <h2>
                  <Sparkles size={17} /> Insights automáticos
                </h2>
                <p>Leituras simples, sem julgamento.</p>
              </div>
              <Lightbulb size={18} />
            </div>
            {insights.map((insight) => (
              <div className="insight-item" key={insight.id}>
                <span>
                  <insight.icon size={17} />
                </span>
                <div>
                  <strong>{insight.title}</strong>
                  <p>{insight.detail}</p>
                </div>
              </div>
            ))}
          </section>
          {!focus && (<section className="panel secondary budget-overview">
            <div className="section-head">
              <h2>De olho no orçamento</h2>
              <button
                className="icon-button"
                aria-label="Ver orçamentos"
                onClick={() => setView("budgets")}
              >
                <ArrowUpRight size={19} />
              </button>
            </div>
            {monthlyBudgets.length ? (
              monthlyBudgets.slice(0, 3).map((budget) => {
                const spent =
                  categoryData.find(
                    (category) => category.name === budget.category,
                  )?.value ?? 0;
                const percentage = Math.round(
                  (spent / budget.amount) * 100,
                );
                return (
                  <div className="budget-mini" key={budget.id}>
                    <div>
                      <span>{budget.category}</span>
                      <strong>{percentage}%</strong>
                    </div>
                    <Progress
                      value={Math.min(100, percentage)}
                      style={
                        {
                          "--progress-color":
                            percentage > 100
                              ? "#c65b48"
                              : categoryColor(budget.category),
                        } as CSSProperties
                      }
                    />
                    <small>
                      {displayMoney(spent)} de{" "}
                      {displayMoney(budget.amount)}
                    </small>
                  </div>
                );
              })
            ) : (
              <p className="soft-text">
                Defina um valor por categoria para acompanhar seus
                limites.
              </p>
            )}
          </section>)}
        </aside>
      </div>
      {!focus && (<section className="panel goals-overview secondary">
        <div className="section-head">
          <div>
            <h2>Seus próximos motivos para guardar</h2>
            <p>Agora com uma sugestão mensal para cada meta.</p>
          </div>
          <button
            className="text-button"
            onClick={() => setView("goals")}
          >
            Minhas metas <ArrowRight size={15} />
          </button>
        </div>
        {state.goals.length ? (
          <div className="goals-grid">
            {state.goals.slice(0, 2).map(goal => <GoalCard key={goal.id} goal={goal} hidden={hidden} openEditor={openEditor} askDelete={askDelete} canDelete={false} />)}
          </div>
        ) : (
          <Empty
            title="O que você quer conquistar?"
            text="Uma reserva, uma viagem ou um plano só seu."
            action={
              <button
                className="text-button"
                onClick={() => openEditor("goals")}
              >
                Criar uma meta <Plus size={16} />
              </button>
            }
          />
        )}
      </section>)}
    </>
  );
}

// Opening a dialog should not render the dashboard's charts again.
export default memo(OverviewPage);
