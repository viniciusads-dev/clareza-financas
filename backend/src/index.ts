import { z } from "zod";
import {
  addMonths,
  cardDue,
  nextRecurrenceDate,
  splitAmount,
  today,
  type Recurrence,
  type State,
  type Transaction,
} from "../../shared/finance";
export interface Env {
  DB: D1Database;
}
type AppUser = { id: string; email: string; name: string };
const SESSION_COOKIE = "clareza_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
// Cloudflare Workers limits PBKDF2 to 100,000 iterations.
const PASSWORD_ITERATIONS = 100000;
const encoder = new TextEncoder();
const cents = z.number().int().min(0).max(100000000000);
const amount = cents.min(1);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + "T12:00:00Z");
    return !isNaN(+d) && d.toISOString().slice(0, 10) === v;
  }, "Data inválida");
const name = z.string().trim().min(1).max(100);
const id = z.string().min(1).max(100);
const color = z.string().regex(/^#[\da-fA-F]{6}$/);
const schemas = {
  accounts: z
    .object({
      name,
      kind: z.enum(["checking", "cash", "credit"]),
      opening: z.number().int().min(-100000000000).max(100000000000),
      color,
      limit: cents,
      closing: z.number().int().min(1).max(31),
      due: z.number().int().min(1).max(31),
    })
    .strict(),
  transactions: z
    .object({
      title: name,
      amount,
      type: z.enum(["expense", "income", "transfer"]),
      category: name,
      accountId: id,
      toId: id.optional(),
      date,
      status: z.enum(["paid", "pending"]),
      subcategory: name.optional(),
      tags: z.array(id).max(8).optional(),
      invoiceMonth: z
        .string()
        .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
        .optional(),
      installments: z.number().int().min(1).max(48).default(1),
    })
    .strict(),
  budgets: z
    .object({
      category: name,
      amount,
      month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    })
    .strict(),
  goals: z.object({ name, target: amount, saved: cents, date, color }).strict(),
  recurrences: z
    .object({
      title: name,
      amount,
      type: z.enum(["expense", "income"]),
      category: name,
      subcategory: name.optional(),
      tags: z.array(id).max(8).optional(),
      accountId: id,
      startDate: date,
      nextDate: date,
      frequency: z.enum(["weekly", "monthly", "yearly"]),
      endDate: date.optional(),
      active: z.boolean(),
    })
    .strict(),
  categories: z
    .object({
      name,
      type: z.enum(["expense", "income"]),
      parentId: id.optional(),
      color,
    })
    .strict(),
  tags: z.object({ name, color }).strict(),
};
class HttpError extends Error {
  constructor(
    public code: number,
    message: string,
  ) {
    super(message);
  }
}
function json(
  data: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      ...extraHeaders,
    },
  });
}
export async function readState(db: D1Database, owner: string): Promise<State> {
  const { results } = await db
    .prepare(
      "SELECT id, kind, data FROM finance_records WHERE owner = ? ORDER BY created, id",
    )
    .bind(owner)
    .all<{ id: string; kind: keyof State; data: string }>();
  const state: State = {
    accounts: [],
    transactions: [],
    budgets: [],
    goals: [],
    recurrences: [],
    categories: [],
    tags: [],
  };
  for (const r of results) {
    if (r.kind in state)
      (state[r.kind] as unknown[]).push({ ...JSON.parse(r.data), id: r.id });
  }
  return state;
}
function insert(
  db: D1Database,
  owner: string,
  kind: string,
  data: object,
  recordId = crypto.randomUUID(),
) {
  return db
    .prepare(
      "INSERT INTO finance_records (id, owner, kind, data, created) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(recordId, owner, kind, JSON.stringify(data), Date.now());
}
async function syncRecurrences(db: D1Database, owner: string) {
  const { results } = await db
    .prepare(
      "SELECT id, data FROM finance_records WHERE owner = ? AND kind = 'recurrences' ORDER BY created, id",
    )
    .bind(owner)
    .all<{ id: string; data: string }>();
  const cutoff = today();
  const statements: D1PreparedStatement[] = [];
  for (const row of results) {
    let recurrence: Omit<Recurrence, "id">;
    try {
      recurrence = JSON.parse(row.data) as Omit<Recurrence, "id">;
    } catch {
      continue;
    }
    if (!recurrence.active || recurrence.nextDate > cutoff) continue;
    let nextDate = recurrence.nextDate;
    let generated = 0;
    while (
      nextDate <= cutoff &&
      generated < 120 &&
      (!recurrence.endDate || nextDate <= recurrence.endDate)
    ) {
      statements.push(
        insert(db, owner, "transactions", {
          title: recurrence.title,
          amount: recurrence.amount,
          type: recurrence.type,
          category: recurrence.category,
          ...(recurrence.subcategory
            ? { subcategory: recurrence.subcategory }
            : {}),
          ...(recurrence.tags?.length ? { tags: recurrence.tags } : {}),
          accountId: recurrence.accountId,
          date: nextDate,
          status: "pending",
          installments: 1,
          recurrenceId: row.id,
        }));
      const following = nextRecurrenceDate(nextDate, recurrence.frequency);
      if (following <= nextDate) break;
      nextDate = following;
      generated += 1;
    }
    const active = !recurrence.endDate || nextDate <= recurrence.endDate;
    if (generated || active !== recurrence.active) {
      statements.push(
        db
          .prepare(
            "UPDATE finance_records SET data = ? WHERE id = ? AND owner = ? AND kind = 'recurrences'",
          )
          .bind(
            JSON.stringify({ ...recurrence, nextDate, active }),
            row.id,
            owner,
          ),
      );
    }
  }
  if (statements.length) await db.batch(statements);
}
async function body(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new HttpError(415, "Envie dados em JSON.");
  if (Number(request.headers.get("content-length") ?? 0) > 16000)
    throw new HttpError(413, "Solicitação muito grande.");
  const reader = request.body?.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  if (reader) {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16000) {
        await reader.cancel();
        throw new HttpError(413, "Solicitação muito grande.");
      }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const text = new TextDecoder().decode(bytes);
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Dados inválidos.");
  }
}

const authSchemas = {
  register: z
    .object({
      name: z.string().trim().min(2, "Informe seu nome.").max(80),
      email: z.string().trim().email("Informe um e-mail válido.").max(254),
      password: z
        .string()
        .min(8, "A senha precisa ter pelo menos 8 caracteres.")
        .max(128),
      privacyAccepted: z
        .boolean()
        .refine((value) => value, {
          message: "Confirme a política de privacidade para criar sua conta.",
        }),
    })
    .strict(),
  login: z
    .object({
      email: z.string().trim().email("Informe um e-mail válido.").max(254),
      password: z.string().min(1, "Informe sua senha.").max(128),
    })
    .strict(),
};
function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function fromBase64Url(value: string) {
  const normalized =
    value.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((value.length + 3) % 4);
  const binary = atob(normalized);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
async function digestText(value: string) {
  return hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}
async function hashPassword(
  password: string,
  salt: Uint8Array,
  iterations = PASSWORD_ITERATIONS,
) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return toBase64Url(new Uint8Array(bits));
}
async function createPasswordHash(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: toBase64Url(salt), hash: await hashPassword(password, salt) };
}
async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string,
  iterations: number,
) {
  try {
    return (
      (await hashPassword(password, fromBase64Url(storedSalt), iterations)) ===
      storedHash
    );
  } catch {
    return false;
  }
}
function cookieValue(request: Request, name: string) {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}
function sessionCookie(token: string, url: URL, maxAge = SESSION_TTL_SECONDS) {
  const secure = url.protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}
function clearSessionCookie(url: URL) {
  return sessionCookie("", url, 0);
}
function sameOrigin(request: Request, url: URL) {
  const origin = request.headers.get("origin");
  if (
    !origin ||
    origin !== url.origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new HttpError(403, "Origem não autorizada.");
}
async function currentUser(
  db: D1Database,
  request: Request,
): Promise<AppUser | null> {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await digestText(token);
  return (
    (await db
      .prepare(
        "SELECT u.id, u.email, u.name FROM app_sessions s INNER JOIN app_users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires > ?",
      )
      .bind(tokenHash, Date.now())
      .first<AppUser>()) ?? null
  );
}
async function issueSession(db: D1Database, userId: string) {
  const token = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const now = Date.now();
  const statement = db
    .prepare(
      "INSERT INTO app_sessions (id, user_id, token_hash, created, expires) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(
      crypto.randomUUID(),
      userId,
      await digestText(token),
      now,
      now + SESSION_TTL_SECONDS * 1000,
    );
  return { token, statement };
}
function publicUser(user: AppUser) {
  return { id: user.id, email: user.email, name: user.name };
}
async function handleAuth(
  request: Request,
  env: Env,
  url: URL,
  path: string[],
) {
  if (!env.DB)
    throw new HttpError(503, "O serviço de contas ainda não está disponível.");
  const action = path[1];
  if (request.method === "GET" && action === "session") {
    const user = await currentUser(env.DB, request);
    return json({
      authenticated: !!user,
      user: user ? publicUser(user) : null,
    });
  }
  if (request.method !== "POST")
    throw new HttpError(405, "Operação não permitida.");
  sameOrigin(request, url);
  if (action === "logout") {
    const token = cookieValue(request, SESSION_COOKIE);
    if (token)
      await env.DB.prepare("DELETE FROM app_sessions WHERE token_hash = ?")
        .bind(await digestText(token))
        .run();
    return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie(url) });
  }
  if (action !== "register" && action !== "login")
    throw new HttpError(404, "Rota não encontrada.");
  const input = await body(request);
  const parsed = (
    action === "register" ? authSchemas.register : authSchemas.login
  ).safeParse(input);
  if (!parsed.success)
    throw new HttpError(
      400,
      parsed.error.issues.map((i) => i.message).join(" "),
    );
  if (action === "register") {
    const data = authSchemas.register.parse(input);
    const normalizedEmail = data.email.toLowerCase();
    const existing = await env.DB.prepare(
      "SELECT id FROM app_users WHERE email = ?",
    )
      .bind(normalizedEmail)
      .first();
    if (existing)
      throw new HttpError(409, "Já existe uma conta com este e-mail.");
    const password = await createPasswordHash(data.password);
    const user = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      name: data.name,
    };
    const session = await issueSession(env.DB, user.id);
    try {
      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO app_users (id, email, name, password_hash, password_salt, password_iterations, created) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ).bind(
          user.id,
          user.email,
          user.name,
          password.hash,
          password.salt,
          PASSWORD_ITERATIONS,
          Date.now(),
        ),
        session.statement,
      ]);
    } catch (error) {
      if (String(error).toLowerCase().includes("unique"))
        throw new HttpError(409, "Já existe uma conta com este e-mail.");
      throw error;
    }
    return json({ ok: true, user: publicUser(user) }, 201, {
      "Set-Cookie": sessionCookie(session.token, url),
    });
  }
  const data = authSchemas.login.parse(input);
  const user = await env.DB.prepare(
    "SELECT id, email, name, password_hash, password_salt, password_iterations FROM app_users WHERE email = ?",
  )
    .bind(data.email.toLowerCase())
    .first<
      AppUser & {
        password_hash: string;
        password_salt: string;
        password_iterations: number;
      }
    >();
  if (
    !user ||
    !(await verifyPassword(
      data.password,
      user.password_hash,
      user.password_salt,
      user.password_iterations,
    ))
  )
    throw new HttpError(401, "E-mail ou senha incorretos.");
  const session = await issueSession(env.DB, user.id);
  await session.statement.run();
  return json({ ok: true, user: publicUser(user) }, 200, {
    "Set-Cookie": sessionCookie(session.token, url),
  });
}
export async function handleApi(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const path = url.pathname
      .replace(/^\/api\/?/, "")
      .split("/")
      .filter(Boolean);
    if (path[0] === "auth") return await handleAuth(request, env, url, path);
    const sessionUser = env.DB ? await currentUser(env.DB, request) : null;
    const owner =
      sessionUser?.id ?? request.headers.get("oai-authenticated-user-id");
    if (!owner)
      throw new HttpError(
        401,
        "Entre na sua conta para acessar suas finanças.",
      );
    if (!env.DB)
      throw new HttpError(
        503,
        "Não foi possível acessar seus dados. Tente novamente.",
      );
    if (request.method === "GET" && path[0] === "state") {
      await syncRecurrences(env.DB, owner);
      return json(await readState(env.DB, owner));
    }
    if (!["POST", "PUT", "DELETE"].includes(request.method))
      throw new HttpError(405, "Operação não permitida.");
    const origin = request.headers.get("origin");
    if (
      !origin ||
      origin !== url.origin ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      throw new HttpError(403, "Origem não autorizada.");
    const key = request.headers.get("idempotency-key");
    if (!key || !z.string().uuid().safeParse(key).success)
      throw new HttpError(400, "Chave de operação inválida.");
    const requestId = owner + ":" + key;
    const prior = await env.DB.prepare(
      "SELECT id FROM finance_requests WHERE id = ? AND owner = ?",
    )
      .bind(requestId, owner)
      .first();
    if (prior) return json({ ok: true, replayed: true });
    const recent = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM finance_requests WHERE owner = ? AND created > ?",
    )
      .bind(owner, Date.now() - 60000)
      .first<{ count: number }>();
    if ((recent?.count ?? 0) >= 90)
      throw new HttpError(
        429,
        "Muitas alterações de uma vez. Aguarde um minuto.",
      );
    const kind = path[0] as keyof typeof schemas;
    if (!Object.hasOwn(schemas, kind))
      throw new HttpError(404, "Recurso não encontrado.");
    const state = await readState(env.DB, owner);
    const list = state[kind];
    const record = path[1] ? list.find((r) => r.id === path[1]) : undefined;
    if (path[1] && !record)
      throw new HttpError(404, "Registro não encontrado.");
    if (request.method !== "POST" && !record)
      throw new HttpError(404, "Registro não encontrado.");
    const createdIds: string[] = [];
    const statements: D1PreparedStatement[] = [
      env.DB.prepare(
        "INSERT INTO finance_requests (id, owner, created) VALUES (?, ?, ?)",
      ).bind(requestId, owner, Date.now()),
    ];
    if (request.method === "DELETE") {
      if (
        kind === "accounts" &&
        state.transactions.some(
          (t) => t.accountId === record!.id || t.toId === record!.id,
        )
      )
        throw new HttpError(
          409,
          "Esta conta possui lançamentos. Exclua ou mova os lançamentos primeiro.",
        );
      if (
        kind === "accounts" &&
        state.recurrences.some((recurrence) => recurrence.accountId === record!.id)
      )
        throw new HttpError(
          409,
          "Esta conta possui recorrências. Desative ou mova as recorrências primeiro.",
        );
      if (
        kind === "categories" &&
        state.categories.some((category) => category.parentId === record!.id)
      )
        throw new HttpError(
          409,
          "Esta categoria possui subcategorias. Exclua as subcategorias primeiro.",
        );
      statements.push(
        env.DB.prepare(
          "DELETE FROM finance_records WHERE id = ? AND owner = ? AND kind = ?",
        ).bind(record!.id, owner, kind),
      );
    } else {
      const input = await body(request);
      const parsed = schemas[kind].safeParse(input);
      if (!parsed.success)
        throw new HttpError(
          400,
          parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        );
      const data = parsed.data;
      if (kind === "transactions") {
        const t = schemas.transactions.parse(data);
        const account = state.accounts.find((a) => a.id === t.accountId);
        if (!account) throw new HttpError(400, "Escolha uma conta válida.");
        if (t.type === "transfer") {
          const dest = state.accounts.find((a) => a.id === t.toId);
          if (!dest || dest.id === account.id || account.kind === "credit")
            throw new HttpError(
              400,
              "Escolha contas válidas para a transferência.",
            );
          if (t.status !== "paid")
            throw new HttpError(400, "Transferências devem estar concluídas.");
        }
        if (account.kind === "credit" && t.type === "income")
          throw new HttpError(
            400,
            "Registre o pagamento do cartão como transferência.",
          );
        if (
          t.subcategory &&
          !state.categories.some(
            (category) =>
              category.name === t.subcategory &&
              category.type === (t.type === "income" ? "income" : "expense") &&
              category.parentId ===
                state.categories.find((parent) => parent.name === t.category)
                  ?.id,
          )
        )
          throw new HttpError(400, "Escolha uma subcategoria válida.");
        if (
          t.tags?.some((tagId) => !state.tags.some((tag) => tag.id === tagId))
        )
          throw new HttpError(400, "Existe uma tag inválida no lançamento.");
        if (
          t.installments > 1 &&
          (account.kind !== "credit" || t.type !== "expense")
        )
          throw new HttpError(
            400,
            "Parcelamento disponível para despesas no cartão.",
          );
        if (t.amount < t.installments)
          throw new HttpError(
            400,
            "O valor deve cobrir ao menos um centavo por parcela.",
          );
        if (request.method === "PUT") {
          const old = record as Transaction;
          if (old.installments && old.installments > 1)
            throw new HttpError(
              400,
              "Exclua a parcela e registre a correção para preservar as demais parcelas.",
            );
          if (t.installments > 1)
            throw new HttpError(400, "Cadastre uma nova compra para parcelar.");
          statements.push(
            env.DB.prepare(
              "UPDATE finance_records SET data = ? WHERE id = ? AND owner = ? AND kind = ?",
            ).bind(
              JSON.stringify({ ...t, date: t.date, installments: 1 }),
              record!.id,
              owner,
              kind,
            ),
          );
        } else {
          const groupId = crypto.randomUUID();
          const first =
            account.kind === "credit" && t.type === "expense"
              ? cardDue(t.date, account.closing, account.due)
              : t.date;
          for (const [i, value] of splitAmount(
            t.amount,
            t.installments,
          ).entries()) {
            const transactionId = crypto.randomUUID();
            createdIds.push(transactionId);
            statements.push(
              insert(env.DB, owner, kind, {
                ...t,
                amount: value,
                date: addMonths(first, i),
                purchaseDate: t.date,
                groupId,
                installment: i + 1,
              }, transactionId),
            );
          }
        }
      } else {
        if (kind === "recurrences") {
          const recurrence = schemas.recurrences.parse(data);
          const recurrenceAccount = state.accounts.find(
            (account) => account.id === recurrence.accountId,
          );
          if (!recurrenceAccount)
            throw new HttpError(400, "Escolha uma conta válida.");
          if (recurrenceAccount.kind === "credit" && recurrence.type === "income")
            throw new HttpError(
              400,
              "Registre receitas em uma conta que receba dinheiro.",
            );
          if (recurrence.endDate && recurrence.endDate < recurrence.nextDate)
            throw new HttpError(
              400,
              "A data final precisa ser posterior ao próximo lançamento.",
            );
          if (
            recurrence.subcategory &&
            !state.categories.some(
              (category) =>
                category.name === recurrence.subcategory &&
                category.type === recurrence.type &&
                category.parentId ===
                  state.categories.find(
                    (parent) => parent.name === recurrence.category,
                  )?.id,
            )
          )
            throw new HttpError(400, "Escolha uma subcategoria válida.");
          if (
            recurrence.tags?.some(
              (tagId) => !state.tags.some((tag) => tag.id === tagId),
            )
          )
            throw new HttpError(400, "Existe uma tag inválida na recorrência.");
        }
        if (kind === "categories") {
          const category = schemas.categories.parse(data);
          if (category.parentId) {
            const parent = state.categories.find(
              (candidate) => candidate.id === category.parentId,
            );
            if (!parent || parent.type !== category.type)
              throw new HttpError(
                400,
                "A subcategoria precisa pertencer a uma categoria válida.",
              );
            if (record?.id === parent.id)
              throw new HttpError(
                400,
                "Uma categoria não pode ser filha de si mesma.",
              );
          }
          if (
            state.categories.some(
              (candidate) =>
                candidate.id !== record?.id &&
                candidate.type === category.type &&
                candidate.parentId === category.parentId &&
                candidate.name.toLocaleLowerCase() ===
                  category.name.toLocaleLowerCase(),
            )
          )
            throw new HttpError(409, "Já existe uma categoria com este nome.");
        }
        if (kind === "tags") {
          const tag = schemas.tags.parse(data);
          if (
            state.tags.some(
              (candidate) =>
                candidate.id !== record?.id &&
                candidate.name.toLocaleLowerCase() ===
                  tag.name.toLocaleLowerCase(),
            )
          )
            throw new HttpError(409, "Já existe uma tag com este nome.");
        }
        if (kind === "budgets") {
          const b = schemas.budgets.parse(data);
          if (
            state.budgets.some(
              (x) =>
                x.id !== record?.id &&
                x.month === b.month &&
                x.category === b.category,
            )
          )
            throw new HttpError(
              409,
              "Já existe um orçamento para esta categoria neste mês.",
            );
        }
        if (request.method === "PUT") {
          statements.push(
            env.DB.prepare(
              "UPDATE finance_records SET data = ? WHERE id = ? AND owner = ? AND kind = ?",
            ).bind(JSON.stringify(data), record!.id, owner, kind),
          );
        } else {
          const recordId = crypto.randomUUID();
          createdIds.push(recordId);
          statements.push(insert(env.DB, owner, kind, data, recordId));
        }
      }
    }
    await env.DB.batch(statements);
    return json(
      { ok: true, ...(createdIds[0] ? { id: createdIds[0] } : {}) },
      request.method === "POST" ? 201 : 200,
    );
  } catch (error) {
    if (error instanceof HttpError)
      return json({ error: error.message }, error.code);
    console.error(
      "Finance API error",
      error instanceof Error ? error.name : "unknown",
    );
    return json(
      {
        error:
          "Não foi possível concluir a operação. Seus campos foram preservados. Tente novamente.",
      },
      503,
    );
  }
}
export default { fetch: handleApi };
