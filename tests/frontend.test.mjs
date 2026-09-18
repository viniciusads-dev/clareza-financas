import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  OverviewPage, TransactionsPage, AuthSessionError, parseNavigation, navigationSearch, overviewModel, transactionsForAccount, filterTransactions, createEditor,
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
  assert.doesNotMatch(focused, /goals-overview|budget-overview/);
  assert.match(focused, /spending-panel/);
  assert.match(focused, /recent-panel/);
  assert.match(render(OverviewPage, props()), /goals-overview/);
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
  assert.equal(checking.available, 426990);
  assert.ok(checking.stats.tx.every(transaction => transaction.accountId === 'a1' || transaction.toId === 'a1'));
  assert.ok(checking.agendaItems.every(item => item.accountId === 'a1'));
  assert.deepEqual(transactionsForAccount(state, 'a3').map(transaction => transaction.id), ['t9', 't10']);
  assert.equal(card.stats.expense, 34940);
  assert.equal(card.selectedInvoice, 34940);
  assert.equal(card.cardDebt, 34940);
  assert.equal(card.available, 415060);
  assert.ok(all.stats.expense > checking.stats.expense);
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

test('Filtering preserves all matches for export and sorts by descending date', () => {
  const state = largeState();
  state.transactions[122] = { ...state.transactions[122], date: `${month}-20`, subcategory: 'Especial' };
  assert.equal(filterTransactions(state, state.transactions, '', 'all').length, 123);
  assert.equal(filterTransactions(state, state.transactions, '', 'all')[0].id, 'record-122');
  assert.deepEqual(filterTransactions(state, state.transactions, 'ESPECIAL', 'all').map(t => t.id), ['record-122']);
  assert.equal(state.transactions[0].id, 'record-0');
});

test('Pending filter uses credit invoice balance and preserves ordinary pending expenses', () => {
  const bank = { id: 'bank', name: 'Conta', kind: 'checking', opening: 10000 };
  const card = { id: 'card', name: 'Cartão', kind: 'credit', opening: 0 };
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
