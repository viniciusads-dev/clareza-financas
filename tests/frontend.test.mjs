import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  OverviewPage, TransactionsPage, AccountsPage, AgendaPage, AuthSessionError, parseNavigation, navigationSearch, overviewModel, transactionsForAccount, filterTransactions, agendaFor, cardInvoiceForPurchaseDate, cardInvoicesFor, today, createEditor,
  createUiSession, demoState, EMPTY,
} from '../.sites-runtime/frontend-test.mjs';

const month = '2026-09';
const noop = () => {};
function props(state = demoState(month), uiSession = createUiSession()) {
  return { state, month, uiSession, hidden: false, focus: false, demo: false,
    openEditor: noop, askDelete: noop, setView: noop, start: noop,
    preference: noop, quickVersion: 0 };
}
const render = (Page, value) => renderToStaticMarkup(createElement(Page, value));
const rows = html => (html.match(/data-slot="table-row"/g) ?? []).length - 1;
function largeState() {
  const state = demoState(month);
  return { ...state, transactions: Array.from({ length: 123 }, (_, i) => ({
    ...state.transactions[0], id: `record-${i}`, title: `Registro ${i}`,
    date: `${month}-10`,
  })) };
}

test('Inactive overview panels are unmounted in focus mode and return when disabled', () => {
  const normal = render(OverviewPage, props());
  const focused = render(OverviewPage, { ...props(), focus: true });
  assert.match(normal, /goals-overview/);
  assert.match(normal, /budget-overview/);
  assert.match(normal, /Fluxo de caixa projetado/);
  assert.doesNotMatch(focused, /goals-overview|budget-overview/);
  assert.doesNotMatch(focused, /Fluxo de caixa projetado/);
  assert.match(focused, /spending-panel/);
  assert.match(focused, /recent-panel/);
  assert.match(render(OverviewPage, props()), /goals-overview/);
});

test('Overview labels the real balance separately from its cash projection', () => {
  const html = render(OverviewPage, props());
  assert.match(html, /Saldo real nas contas/);
  assert.match(html, /Fluxo de caixa projetado/);
  assert.match(html, /Esta estimativa não reduz o saldo real de hoje/);
  assert.doesNotMatch(html, /Disponível após compromissos|Disponível após pendências/);
});

test('Privacy mode removes chart disclosures and masks ratios', () => {
  const hidden = render(OverviewPage, { ...props(), hidden: true });
  assert.equal((hidden.match(/privacy-chart-placeholder/g) ?? []).length, 2);
  assert.match(hidden, /Gráfico oculto/);
  assert.match(hidden, /Detalhes ocultos/);
  assert.doesNotMatch(hidden, /recharts-tooltip-wrapper/);
});

test('CSV export explains that values remain real when the screen is hidden', () => {
  const hidden = render(TransactionsPage, { ...props(), hidden: true });
  assert.match(hidden, /O CSV inclui os valores reais/);
  assert.match(hidden, /Exportar CSV com os valores reais/);
});

test('Session service failure exposes a retry action', () => {
  const html = render(AuthSessionError, { message: 'Serviço temporariamente indisponível.', onRetry: noop });
  assert.match(html, /Não foi possível verificar sua sessão/);
  assert.match(html, /Serviço temporariamente indisponível/);
  assert.match(html, /Tentar novamente/);
});

test('Navigation state is durable and excludes unsupported query values', () => {
  assert.deepEqual(parseNavigation('?view=transactions&month=2026-02', '2026-09'), { view: 'transactions', month: '2026-02' });
  assert.deepEqual(parseNavigation('?view=unknown&month=2026-13&search=secret', '2026-09'), { view: 'overview', month: '2026-09' });
  assert.equal(navigationSearch('goals', '2026-09'), '?view=goals&month=2026-09');
});

test('Overview can be scoped to one account without changing the consolidated view', () => {
  const state = demoState(month);
  const all = overviewModel(state, month);
  const checking = overviewModel(state, month, 'a1');
  const card = overviewModel(state, month, 'a3');

  assert.equal(all.selectedAccount, undefined);
  assert.equal(checking.selectedAccount?.id, 'a1');
  assert.equal(checking.stats.income, 480000);
  assert.equal(checking.stats.expense, 178010);
  assert.equal(checking.cashPending, 22980);
  assert.equal(checking.cash, 449970);
  assert.equal(checking.projection.startBalance, 449970);
  assert.ok(checking.stats.tx.every(transaction => transaction.accountId === 'a1' || transaction.toId === 'a1'));
  assert.ok(checking.agendaItems.every(item => item.accountId === 'a1'));
  assert.deepEqual(transactionsForAccount(state, 'a3').map(transaction => transaction.id), ['t9', 't10']);
  assert.equal(card.stats.expense, 34940);
  assert.equal(card.selectedInvoice, 34940);
  assert.equal(card.cardDebt, 34940);
  assert.equal(card.cardLimitAvailable, 415060);
  assert.equal(card.projection, null);
  assert.ok(all.stats.expense > checking.stats.expense);
});

test('Overview keeps real cash separate from dated salary and bill projections', () => {
  const state = {
    ...EMPTY,
    accounts: [
      { id: 'bank', name: 'Conta', kind: 'checking', opening: 50000, color: '#267a55', limit: 0, closing: 5, due: 12 },
      { id: 'reserve', name: 'Reserva', kind: 'cash', opening: 100000, color: '#5376d9', limit: 0, closing: 5, due: 12 },
      { id: 'card', name: 'Cartão', kind: 'credit', opening: 0, color: '#d08b45', limit: 500000, closing: 5, due: 12 },
    ],
    transactions: [
      { id: 'salary', title: 'Salário', amount: 191800, type: 'income', category: 'Salário', accountId: 'bank', date: '2026-09-27', status: 'pending' },
      { id: 'college', title: 'Faculdade', amount: 180800, type: 'expense', category: 'Educação', accountId: 'bank', date: '2026-09-30', status: 'pending' },
      { id: 'card-invoice', title: 'Compras no cartão', amount: 25000, type: 'expense', category: 'Compras', accountId: 'card', date: '2026-10-12', status: 'pending' },
    ],
  };

  const result = overviewModel(state, month, 'all', '2026-09-23');

  assert.equal(result.cash, 150000);
  assert.equal(result.projection.startBalance, 150000);
  assert.equal(result.projection.income, 191800);
  assert.equal(result.projection.expense, 205800);
  assert.equal(result.projection.projectedBalance, 136000);
  assert.deepEqual(result.projection.days.map(day => [day.date, day.balance]), [
    ['2026-09-27', 341800],
    ['2026-09-30', 161000],
    ['2026-10-12', 136000],
  ]);
});

test('Cash projection nets internal transfers in the consolidated view and scopes them per account', () => {
  const state = {
    ...EMPTY,
    accounts: [
      { id: 'bank', name: 'Conta', kind: 'checking', opening: 10000, color: '#267a55', limit: 0, closing: 5, due: 12 },
      { id: 'reserve', name: 'Reserva', kind: 'cash', opening: 20000, color: '#5376d9', limit: 0, closing: 5, due: 12 },
    ],
    transactions: [
      { id: 'move', title: 'Complemento da reserva', amount: 5000, type: 'transfer', category: 'Transferência', accountId: 'bank', toId: 'reserve', date: '2026-09-25', status: 'paid' },
    ],
  };

  const all = overviewModel(state, month, 'all', '2026-09-23');
  const bank = overviewModel(state, month, 'bank', '2026-09-23');
  const reserve = overviewModel(state, month, 'reserve', '2026-09-23');

  assert.equal(all.cash, 30000);
  assert.equal(all.projection.projectedBalance, 30000);
  assert.equal(all.projection.income, 0);
  assert.equal(all.projection.expense, 0);
  assert.equal(bank.projection.projectedBalance, 5000);
  assert.equal(reserve.projection.projectedBalance, 25000);
});

test('Cash projection includes each recurring expense occurrence within the horizon', () => {
  const state = {
    ...EMPTY,
    accounts: [
      { id: 'bank', name: 'Conta', kind: 'checking', opening: 50000, color: '#267a55', limit: 0, closing: 5, due: 12 },
    ],
    recurrences: [
      { id: 'weekly', title: 'Aula', amount: 1000, type: 'expense', category: 'Educação', accountId: 'bank', startDate: '2026-09-25', nextDate: '2026-09-25', frequency: 'weekly', active: true },
    ],
  };

  const result = overviewModel(state, month, 'all', '2026-09-23');

  assert.deepEqual(result.projection.days.map(day => day.date), [
    '2026-09-25', '2026-10-02', '2026-10-09', '2026-10-16', '2026-10-23',
  ]);
  assert.equal(result.projection.expense, 5000);
  assert.equal(result.projection.projectedBalance, 45000);
});

test('Cash projection counts scheduled card payments once and ignores payments outside its horizon', () => {
  const state = {
    ...EMPTY,
    accounts: [
      { id: 'bank', name: 'Conta', kind: 'checking', opening: 100000, color: '#267a55', limit: 0, closing: 5, due: 12 },
      { id: 'card', name: 'Cartão', kind: 'credit', opening: 0, color: '#d08b45', limit: 500000, closing: 5, due: 12 },
    ],
    transactions: [
      { id: 'oct-purchase', title: 'Compras', amount: 25000, type: 'expense', category: 'Compras', accountId: 'card', date: '2026-10-12', status: 'pending' },
      { id: 'oct-payment', title: 'Pagamento parcial', amount: 10000, type: 'transfer', category: 'Transferência', accountId: 'bank', toId: 'card', invoiceMonth: '2026-10', date: '2026-10-10', status: 'paid' },
      { id: 'nov-payment', title: 'Pagamento fora do período', amount: 5000, type: 'transfer', category: 'Transferência', accountId: 'bank', toId: 'card', invoiceMonth: '2026-10', date: '2026-11-02', status: 'paid' },
    ],
  };

  const result = overviewModel(state, month, 'all', '2026-09-23');

  assert.equal(result.projection.expense, 25000);
  assert.equal(result.projection.projectedBalance, 75000);
  assert.deepEqual(result.projection.days.map(day => [day.date, day.expense]), [
    ['2026-10-10', 10000],
    ['2026-10-12', 15000],
  ]);
});

test('Account scope only follows transfer destinations', () => {
  const state = demoState(month);
  const malformed = {
    ...state.transactions[0],
    id: 'malformed-destination',
    type: 'expense',
    accountId: 'a1',
    toId: 'a3',
  };
  const scoped = transactionsForAccount(
    { ...state, transactions: [malformed] },
    'a3',
  );
  assert.deepEqual(scoped, []);
});

test('Transactions mount at most 50 records, including the last page and an out-of-range page', () => {
  const state = largeState();
  const cache = createUiSession();
  assert.equal(rows(render(TransactionsPage, props(state, cache))), 50);
  cache.setTransactions({ search: '', filter: 'all', page: 3 });
  const last = render(TransactionsPage, props(state, cache));
  assert.equal(rows(last), 23);
  assert.match(last, /Registro 122/);
  cache.setTransactions({ search: '', filter: 'all', page: 99 });
  assert.equal(rows(render(TransactionsPage, props(state, cache))), 23);
});

test('Transaction filters survive unmount/remount and remain isolated between sessions', () => {
  const cache = createUiSession();
  cache.setTransactions({ search: 'Registro 122', filter: 'all', page: 1 });
  cache.setQuick('Café 12,50');
  const first = render(TransactionsPage, props(largeState(), cache));
  assert.equal(rows(first), 1);
  assert.equal(render(TransactionsPage, props(largeState(), cache)), first);
  assert.equal(cache.getQuick(), 'Café 12,50');
  assert.deepEqual(createUiSession().getTransactions(), { search: '', filter: 'all', page: 1 });
  assert.equal(createUiSession().getQuick(), '');
});

test('Card invoices use the close-date cycle and show full invoice due dates', () => {
  const card = { id: 'card', name: 'Cartão', kind: 'credit', opening: 0, color: '#d08b45', limit: 500000, closing: 24, due: 10 };
  const period = cardInvoiceForPurchaseDate(card, '2026-09-24');
  assert.deepEqual(
    [period.periodStart, period.periodEnd, period.dueDate, period.dueMonth],
    ['2026-08-25', '2026-09-24', '2026-10-10', '2026-10'],
  );
  assert.deepEqual(
    [cardInvoiceForPurchaseDate(card, '2026-09-25').periodStart, cardInvoiceForPurchaseDate(card, '2026-09-25').periodEnd],
    ['2026-09-25', '2026-10-24'],
  );
  const state = {
    ...EMPTY,
    accounts: [card],
    transactions: [{ id: 'buy', title: 'Compra de fechamento', amount: 12345, type: 'expense', category: 'Compras', accountId: card.id, date: period.dueDate, purchaseDate: '2026-09-24', status: 'pending', cardInvoiceId: period.id, cardInvoicePeriodStart: period.periodStart, cardInvoicePeriodEnd: period.periodEnd, cardInvoiceDueDate: period.dueDate }],
  };
  const invoice = cardInvoicesFor(state, card, '2026-09-23').find(item => item.id === period.id);
  assert.equal(invoice?.spent, 12345);
  const html = render(AccountsPage, { ...props(state), setView: noop, start: noop });
  assert.match(html, /Fatura de outubro de 2026/);
  assert.match(html, /Vencimento: 10\/10/);
  assert.match(html, /25\/08–24\/09\/2026/);
  assert.match(html, /Compra de fechamento/);
  assert.match(html, /Compra em 24 de set/);
  const transactions = render(TransactionsPage, { ...props(state), month: '2026-10' });
  assert.match(transactions, /Faturas · Cartão/);
  assert.match(transactions, /Visualizar movimentos/);
});

test('Agenda exposes editable pending card installments with purchase and invoice context', () => {
  const card = { id: 'card', name: 'Cartão', kind: 'credit', opening: 0, color: '#d08b45', limit: 500000, closing: 24, due: 10 };
  const period = cardInvoiceForPurchaseDate(card, '2026-09-24');
  const transaction = { id: 'installment', title: 'Notebook', amount: 50000, type: 'expense', category: 'Compras', accountId: card.id, date: period.dueDate, purchaseDate: '2026-08-27', status: 'pending', installment: 2, installments: 6, cardInvoiceId: period.id, cardInvoicePeriodStart: period.periodStart, cardInvoicePeriodEnd: period.periodEnd, cardInvoiceDueDate: period.dueDate };
  const state = { ...EMPTY, accounts: [card], transactions: [transaction] };
  const items = agendaFor(state, '2026-09-23');
  assert.equal(items.length, 1);
  assert.equal(items[0].source?.kind, 'transactions');
  assert.match(items[0].context, /Parcela 2\/6/);
  const html = render(AgendaPage, { ...props(state) });
  assert.match(html, /Editar Notebook/);
  assert.match(html, /Excluir Notebook/);
  assert.match(html, /Fatura vence 10 de out/);
});

test('Filtering preserves all matches for export and sorts by descending date', () => {
  const state = largeState();
  state.transactions[122] = { ...state.transactions[122], date: `${month}-20`, subcategory: 'Especial' };
  assert.equal(filterTransactions(state, state.transactions, '', 'all').length, 123);
  assert.equal(filterTransactions(state, state.transactions, '', 'all')[0].id, 'record-122');
  assert.deepEqual(filterTransactions(state, state.transactions, 'ESPECIAL', 'all').map(t => t.id), ['record-122']);
  assert.equal(state.transactions[0].id, 'record-0');
});

test('Pending filter uses credit invoice balance and preserves ordinary pending expenses', () => {
  const bank = { id: 'bank', name: 'Conta', kind: 'checking', opening: 10000, closing: 5, due: 12 };
  const card = { id: 'card', name: 'Cartão', kind: 'credit', opening: 0, closing: 5, due: 12 };
  const expense = { id: 'purchase', title: 'Compra', category: 'Outros', amount: 1000, accountId: 'card', type: 'expense', status: 'pending', date: `${month}-10` };
  const cash = { ...expense, id: 'cash', accountId: 'bank' };
  const payment = { ...expense, id: 'payment', type: 'transfer', status: 'paid', accountId: 'bank', toId: 'card', invoiceMonth: month };
  const state = { ...EMPTY, accounts: [bank, card], transactions: [expense, cash] };
  assert.equal(filterTransactions(state, state.transactions, '', 'pending').length, 2);
  const paid = { ...state, transactions: [...state.transactions, payment] };
  assert.deepEqual(filterTransactions(paid, paid.transactions, '', 'pending').map(t => t.id), ['cash']);
});

test('Editor retains money conversion, tag IDs and credit payment prefill', () => {
  const state = demoState(month);
  const record = { ...state.transactions[0], amount: 12345, tags: ['one', 'two'] };
  const editor = createEditor(state, month, 'transactions', record);
  assert.equal(editor.id, record.id);
  assert.equal(editor.values.amount, '123,45');
  assert.equal(editor.values.tags, 'one,two');
  const payment = createEditor(state, month, 'transactions', undefined, { type: 'transfer', toId: 'card', amount: '123.45', invoiceMonth: month });
  assert.equal(payment.values.type, 'transfer');
  assert.equal(payment.values.toId, 'card');
  assert.equal(payment.values.invoiceMonth, month);
  assert.equal(payment.values.amount, '123.45');
});
