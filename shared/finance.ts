export type Account = {
    id: string;
    name: string;
    kind: "checking" | "cash" | "credit";
    opening: number;
    color: string;
    limit: number;
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
export function cardDue(date: string, closing: number, due: number) {
    const [y, m, d] = date.split("-").map(Number);
    const shift = (d >= closing ? 1 : 0) + (due <= closing ? 1 : 0);
    const base = addMonths(`${y}-${String(m).padStart(2, "0")}-01`, shift);
    const [by, bm] = base.split("-").map(Number);
    return `${base.slice(0, 7)}-${String(Math.min(due, new Date(Date.UTC(by, bm, 0)).getUTCDate())).padStart(2, "0")}`;
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

export function invoiceBalance(
    s: State,
    accountId: string,
    month: string,
): number {
    const purchases = s.transactions
        .filter(
            (t) =>
                t.accountId === accountId &&
                t.type === "expense" &&
                t.date.startsWith(month),
        )
        .reduce((n, t) => n + t.amount, 0);
    const payments = s.transactions
        .filter(
            (t) =>
                t.toId === accountId &&
                t.type === "transfer" &&
                t.status === "paid" &&
                (t.invoiceMonth ?? t.date.slice(0, 7)) === month,
        )
        .reduce((n, t) => n + t.amount, 0);
    return Math.max(0, purchases - payments);
}
