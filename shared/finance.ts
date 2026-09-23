export type Account = {
    id: string;
    name: string;
    kind: "checking" | "cash" | "credit";
    opening: number;
    color: string;
    limit: number;
    monthlyTarget?: number;
    closing: number;
    due: number;
};
export type Transaction = {
    id: string;
    title: string;
    amount: number;
    type: "expense" | "income" | "transfer";
    category: string;
    accountId: string;
    toId?: string;
    date: string;
    status: "paid" | "pending";
    groupId?: string;
    installment?: number;
    installments?: number;
    purchaseDate?: string;
    invoiceMonth?: string;
    cardInvoiceId?: string;
    cardInvoicePeriodStart?: string;
    cardInvoicePeriodEnd?: string;
    cardInvoiceDueDate?: string;
    subcategory?: string;
    tags?: string[];
    recurrenceId?: string;
    incomePlanId?: string;
    incomePeriod?: string;
};
export type Budget = {
    id: string;
    category: string;
    amount: number;
    month: string;
};
export type Goal = {
    id: string;
    name: string;
    target: number;
    saved: number;
    date: string;
    color: string;
};
export type RecurrenceFrequency = "weekly" | "monthly" | "yearly";
export type Recurrence = {
    id: string;
    title: string;
    amount: number;
    type: "expense" | "income";
    category: string;
    subcategory?: string;
    tags?: string[];
    accountId: string;
    startDate: string;
    nextDate: string;
    frequency: RecurrenceFrequency;
    endDate?: string;
    active: boolean;
};
export type IncomePlan = {
    id: string;
    title: string;
    amount: number;
    accountId?: string;
    dayOfMonth?: number;
    startMonth: string;
    nextPeriod?: string;
    nextDate?: string;
    active: boolean;
    automatic: boolean;
    businessDayRule: "previous_business_day";
};
export type Category = {
    id: string;
    name: string;
    type: "expense" | "income";
    parentId?: string;
    color: string;
};
export type Tag = {
    id: string;
    name: string;
    color: string;
};
export type State = {
    accounts: Account[];
    transactions: Transaction[];
    budgets: Budget[];
    goals: Goal[];
    recurrences: Recurrence[];
    incomePlans: IncomePlan[];
    categories: Category[];
    tags: Tag[];
};
export const EMPTY: State = {
    accounts: [],
    transactions: [],
    budgets: [],
    goals: [],
    recurrences: [],
    incomePlans: [],
    categories: [],
    tags: [],
};

export type CardInvoicePeriod = {
    id: string;
    cardId: string;
    periodStart: string;
    periodEnd: string;
    dueDate: string;
    dueMonth: string;
};

export type CardInvoice = CardInvoicePeriod & {
    purchases: Transaction[];
    payments: Transaction[];
    spent: number;
    paid: number;
    scheduledPayment: number;
    outstanding: number;
    projectedOutstanding: number;
    status: "open" | "closed" | "paid" | "overdue";
    previousSpent: number;
    topCategory?: { name: string; amount: number };
};
export const categories = [
    "Alimentação",
    "Moradia",
    "Transporte",
    "Saúde",
    "Educação",
    "Lazer",
    "Compras",
    "Assinaturas",
    "Salário",
    "Freelance",
    "Outros",
];
export const colors = [
    "#24a67a",
    "#5376d9",
    "#e5a04d",
    "#9b78d2",
    "#cf7599",
    "#6b91a3",
];
export const brl = (cents: number) =>
    new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(cents / 100);
export const today = () =>
    new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
export function money(value: string): number {
    const s = value
        .trim()
        .replace(/R\$\s*/g, "")
        .replace(/\s/g, "");
    const normalized = s.includes(",")
        ? s.replace(/\./g, "").replace(",", ".")
        : s;
    if (!/^-?\d+(\.\d{1,2})?$/.test(normalized))
        throw Error("Informe um valor válido, como 35,90.");
    const n = Math.round(Number(normalized) * 100);
    if (!Number.isSafeInteger(n) || Math.abs(n) > 100000000000)
        throw Error("Valor fora do limite.");
    return n;
}
export function addMonths(date: string, n: number): string {
    const [y, m, d] = date.split("-").map(Number);
    const end = new Date(Date.UTC(y, m + n, 0)).getUTCDate();
    return new Date(Date.UTC(y, m - 1 + n, Math.min(d, end)))
        .toISOString()
        .slice(0, 10);
}
export function addDays(date: string, n: number): string {
    const value = new Date(`${date}T12:00:00Z`);
    value.setUTCDate(value.getUTCDate() + n);
    return value.toISOString().slice(0, 10);
}
function easterSunday(year: number): string {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function brazilianHolidays(year: number): Set<string> {
    const fixed = [
        "01-01",
        "04-21",
        "05-01",
        "09-07",
        "10-12",
        "11-02",
        "11-15",
        "11-20",
        "12-25",
    ].map((monthDay) => `${year}-${monthDay}`);
    const easter = easterSunday(year);
    return new Set([
        ...fixed,
        addDays(easter, -48),
        addDays(easter, -47),
        addDays(easter, -2),
        addDays(easter, 60),
    ]);
}
export function isBusinessDay(date: string): boolean {
    const day = new Date(`${date}T12:00:00Z`).getUTCDay();
    return (
        day !== 0 &&
        day !== 6 &&
        !brazilianHolidays(Number(date.slice(0, 4))).has(date)
    );
}
export function scheduledIncomeDate(month: string, dayOfMonth: number): string {
    const [year, monthNumber] = month.split("-").map(Number);
    const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    let result = `${month}-${String(Math.min(dayOfMonth, lastDay)).padStart(2, "0")}`;
    while (!isBusinessDay(result)) result = addDays(result, -1);
    return result;
}
export function nextRecurrenceDate(
    date: string,
    frequency: RecurrenceFrequency,
): string {
    if (frequency === "weekly") return addDays(date, 7);
    return addMonths(date, frequency === "yearly" ? 12 : 1);
}
function dateAtDay(month: string, day: number) {
    const [year, monthNumber] = month.split("-").map(Number);
    const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    return `${month}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

export function cardInvoiceForPeriodEnd(
    card: Account,
    periodEnd: string,
): CardInvoicePeriod {
    const endMonth = periodEnd.slice(0, 7);
    const end = dateAtDay(endMonth, card.closing);
    const startMonth = addMonths(`${endMonth}-01`, -1).slice(0, 7);
    const previousEnd = dateAtDay(startMonth, card.closing);
    const dueMonth = card.due <= card.closing
        ? addMonths(`${endMonth}-01`, 1).slice(0, 7)
        : endMonth;
    const dueDate = dateAtDay(dueMonth, card.due);
    return {
        id: `${card.id}:${end}`,
        cardId: card.id,
        periodStart: addDays(previousEnd, 1),
        periodEnd: end,
        dueDate,
        dueMonth,
    };
}

export function cardInvoiceForPurchaseDate(
    card: Account,
    purchaseDate: string,
): CardInvoicePeriod {
    const month = purchaseDate.slice(0, 7);
    const closeThisMonth = dateAtDay(month, card.closing);
    const periodEnd = purchaseDate <= closeThisMonth
        ? closeThisMonth
        : dateAtDay(addMonths(`${month}-01`, 1).slice(0, 7), card.closing);
    return cardInvoiceForPeriodEnd(card, periodEnd);
}

export function cardInvoiceForDueMonth(
    card: Account,
    dueMonth: string,
): CardInvoicePeriod {
    const closeMonth = card.due <= card.closing
        ? addMonths(`${dueMonth}-01`, -1).slice(0, 7)
        : dueMonth;
    return cardInvoiceForPeriodEnd(card, dateAtDay(closeMonth, card.closing));
}

export function cardInvoiceForDueDate(
    card: Account,
    dueDate: string,
): CardInvoicePeriod {
    const period = cardInvoiceForDueMonth(card, dueDate.slice(0, 7));
    return { ...period, dueDate, dueMonth: dueDate.slice(0, 7) };
}

export function cardInvoiceForTransaction(
    state: State,
    transaction: Transaction,
): CardInvoicePeriod | undefined {
    const card = transaction.type === "transfer"
        ? state.accounts.find((account) => account.id === transaction.toId && account.kind === "credit")
        : state.accounts.find((account) => account.id === transaction.accountId && account.kind === "credit");
    if (!card) return undefined;

    if (
        transaction.cardInvoiceId &&
        transaction.cardInvoicePeriodStart &&
        transaction.cardInvoicePeriodEnd &&
        transaction.cardInvoiceDueDate
    ) {
        return {
            id: transaction.cardInvoiceId,
            cardId: card.id,
            periodStart: transaction.cardInvoicePeriodStart,
            periodEnd: transaction.cardInvoicePeriodEnd,
            dueDate: transaction.cardInvoiceDueDate,
            dueMonth: transaction.cardInvoiceDueDate.slice(0, 7),
        };
    }

    const invoiceIdPrefix = `${card.id}:`;
    if (transaction.cardInvoiceId?.startsWith(invoiceIdPrefix)) {
        const periodEnd = transaction.cardInvoiceId.slice(invoiceIdPrefix.length);
        if (/^\d{4}-\d{2}-\d{2}$/.test(periodEnd))
            return cardInvoiceForPeriodEnd(card, periodEnd);
    }

    if (transaction.type === "transfer" && transaction.invoiceMonth)
        return cardInvoiceForDueMonth(card, transaction.invoiceMonth);
    return cardInvoiceForDueDate(card, transaction.date);
}

export function nextCardInvoicePeriod(
    card: Account,
    period: CardInvoicePeriod,
    offset = 1,
): CardInvoicePeriod {
    const nextMonth = addMonths(`${period.periodEnd.slice(0, 7)}-01`, offset).slice(0, 7);
    return cardInvoiceForPeriodEnd(card, dateAtDay(nextMonth, card.closing));
}

export function cardDue(date: string, closing: number, due: number) {
    const temporaryCard: Account = {
        id: "card",
        name: "Cartão",
        kind: "credit",
        opening: 0,
        color: colors[0],
        limit: 0,
        closing,
        due,
    };
    return cardInvoiceForPurchaseDate(temporaryCard, date).dueDate;
}
export function splitAmount(amount: number, n: number): number[] {
    const base = Math.floor(amount / n);
    return Array.from({ length: n }, (_, i) => base + (i < amount % n ? 1 : 0));
}
export function balances(s: State, asOf = today()): Record<string, number> {
    const out: Record<string, number> = {};
    for (const a of s.accounts) out[a.id] = a.opening;
    for (const t of s.transactions) {
        const a = s.accounts.find((a) => a.id === t.accountId);
        if (!a) continue;
        if (t.type === "transfer") {
            if (t.status === "paid" && t.date <= asOf) {
                out[t.accountId] -= t.amount;
                if (t.toId) out[t.toId] = (out[t.toId] ?? 0) + t.amount;
            }
        } else if (
            a.kind === "credit" ||
            (t.status === "paid" && t.date <= asOf)
        ) {
            out[t.accountId] += (t.type === "income" ? 1 : -1) * t.amount;
        }
    }
    return out;
}
export function monthStats(s: State, month: string) {
    const tx = s.transactions.filter((t) => t.date.startsWith(month));
    const income = tx
        .filter((t) => t.type === "income")
        .reduce((n, t) => n + t.amount, 0);
    const expense = tx
        .filter((t) => t.type === "expense")
        .reduce((n, t) => n + t.amount, 0);
    return { tx, income, expense };
}

export type CreditCardInvoiceSummary = {
    month: string;
    spent: number;
    paid: number;
    outstanding: number;
    previousSpent: number;
    change: number;
    futureCommitted: number;
    upcomingInvoices: { month: string; spent: number; paid: number; outstanding: number }[];
    topCategory?: { name: string; amount: number };
};

export function creditCardInvoiceSummary(
    s: State,
    accountId: string,
    month: string,
    asOf = today(),
): CreditCardInvoiceSummary {
    const monthly = new Map<string, {
        spent: number;
        paid: number;
        scheduledPayment: number;
        categories: Map<string, number>;
    }>();
    const bucket = (period: string) => {
        let result = monthly.get(period);
        if (!result) {
            result = { spent: 0, paid: 0, scheduledPayment: 0, categories: new Map() };
            monthly.set(period, result);
        }
        return result;
    };

    for (const transaction of s.transactions) {
        if (
            transaction.accountId === accountId &&
            transaction.type === "expense"
        ) {
            const result = bucket(transaction.date.slice(0, 7));
            result.spent += transaction.amount;
            result.categories.set(
                transaction.category,
                (result.categories.get(transaction.category) ?? 0) + transaction.amount,
            );
        } else if (
            transaction.toId === accountId &&
            transaction.type === "transfer" &&
            transaction.status === "paid"
        ) {
            const period = transaction.invoiceMonth ?? transaction.date.slice(0, 7);
            if (transaction.date <= asOf)
                bucket(period).paid += transaction.amount;
            else
                bucket(period).scheduledPayment += transaction.amount;
        }
    }

    const totalsFor = (period: string) => {
        const result = monthly.get(period);
        const spent = result?.spent ?? 0;
        const paid = result?.paid ?? 0;
        const scheduledPayment = result?.scheduledPayment ?? 0;
        const outstanding = Math.max(0, spent - paid);
        return {
            month: period,
            spent,
            paid,
            scheduledPayment,
            outstanding,
            projectedOutstanding: Math.max(0, outstanding - scheduledPayment),
        };
    };
    const current = totalsFor(month);
    const previousMonth = addMonths(`${month}-01`, -1).slice(0, 7);
    const previousSpent = totalsFor(previousMonth).spent;
    const futureMonths = [...monthly.entries()]
        .filter(([period, totals]) => period > month && totals.spent > 0)
        .map(([period]) => period)
        .sort();
    const futureCommitted = futureMonths.reduce(
        (total, period) => total + totalsFor(period).projectedOutstanding,
        0,
    );
    const upcomingInvoices = futureMonths
        .slice(0, 3)
        .map((period) => {
            const total = totalsFor(period);
            return { ...total, outstanding: total.projectedOutstanding };
        });
    const topCategory = [...(monthly.get(month)?.categories ?? new Map())]
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)[0];

    return {
        ...current,
        previousSpent,
        change: current.spent - previousSpent,
        futureCommitted,
        upcomingInvoices,
        ...(topCategory ? { topCategory } : {}),
    };
}

export function invoiceBalance(
    s: State,
    accountId: string,
    month: string,
    asOf = today(),
): number {
    const purchases = s.transactions
        .filter(
            (transaction) =>
                transaction.accountId === accountId &&
                transaction.type === "expense" &&
                transaction.date.startsWith(month),
        )
        .reduce((total, transaction) => total + transaction.amount, 0);
    const payments = s.transactions
        .filter(
            (transaction) =>
                transaction.toId === accountId &&
                transaction.type === "transfer" &&
                transaction.status === "paid" &&
                transaction.date <= asOf &&
                (transaction.invoiceMonth ?? transaction.date.slice(0, 7)) === month,
        )
        .reduce((total, transaction) => total + transaction.amount, 0);
    return Math.max(0, purchases - payments);
}

export function cardInvoicesFor(
    state: State,
    card: Account,
    asOf = today(),
): CardInvoice[] {
    const buckets = new Map<string, {
        period: CardInvoicePeriod;
        purchases: Transaction[];
        payments: Transaction[];
    }>();
    const ensure = (period: CardInvoicePeriod) => {
        let bucket = buckets.get(period.id);
        if (!bucket) {
            bucket = { period, purchases: [], payments: [] };
            buckets.set(period.id, bucket);
        }
        return bucket;
    };

    const current = cardInvoiceForPurchaseDate(card, asOf);
    ensure(nextCardInvoicePeriod(card, current, -1));
    ensure(current);
    ensure(nextCardInvoicePeriod(card, current));

    for (const transaction of state.transactions) {
        if (
            transaction.accountId === card.id &&
            transaction.type === "expense"
        ) {
            const period = cardInvoiceForTransaction(state, transaction);
            if (period) ensure(period).purchases.push(transaction);
        } else if (
            transaction.toId === card.id &&
            transaction.type === "transfer"
        ) {
            const period = cardInvoiceForTransaction(state, transaction);
            if (period) ensure(period).payments.push(transaction);
        }
    }

    const ordered = [...buckets.values()].sort((a, b) =>
        a.period.periodEnd.localeCompare(b.period.periodEnd),
    );
    return ordered.map((bucket) => {
        const purchases = bucket.purchases.sort((a, b) =>
            a.date.localeCompare(b.date) || a.title.localeCompare(b.title),
        );
        const payments = bucket.payments.sort((a, b) =>
            a.date.localeCompare(b.date),
        );
        const spent = purchases.reduce((sum, transaction) => sum + transaction.amount, 0);
        const paid = payments
            .filter((transaction) => transaction.status === "paid" && transaction.date <= asOf)
            .reduce((sum, transaction) => sum + transaction.amount, 0);
        const scheduledPayment = payments
            .filter((transaction) => transaction.status === "paid" && transaction.date > asOf)
            .reduce((sum, transaction) => sum + transaction.amount, 0);
        const outstanding = Math.max(0, spent - paid);
        const categoryAmounts = new Map<string, number>();
        for (const transaction of purchases)
            categoryAmounts.set(
                transaction.category,
                (categoryAmounts.get(transaction.category) ?? 0) + transaction.amount,
            );
        const topCategory = [...categoryAmounts]
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount)[0];
        const priorPeriod = nextCardInvoicePeriod(card, bucket.period, -1);
        const priorInvoice = buckets.get(priorPeriod.id);
        const previousTotal = priorInvoice?.purchases.reduce(
            (sum, transaction) => sum + transaction.amount,
            0,
        ) ?? 0;
        const status: CardInvoice["status"] = outstanding === 0 && spent > 0
            ? "paid"
            : bucket.period.dueDate < asOf && outstanding > 0
                ? "overdue"
                : bucket.period.periodEnd < asOf
                    ? "closed"
                    : "open";

        return {
            ...bucket.period,
            purchases,
            payments,
            spent,
            paid,
            scheduledPayment,
            outstanding,
            projectedOutstanding: Math.max(0, outstanding - scheduledPayment),
            status,
            previousSpent: previousTotal,
            ...(topCategory ? { topCategory } : {}),
        };
    });
}
