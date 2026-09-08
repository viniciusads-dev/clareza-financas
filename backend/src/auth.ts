import { z } from "zod";

export type Actor = {
  owner: string;
  kind: "session" | "bearer";
  scopes: Set<"finance:read" | "finance:write">;
};

type TokenRow = {
  id: string;
  owner: string;
  scopes: string;
  expires_at: number | null;
  revoked_at: number | null;
};

const textEncoder = new TextEncoder();
const tokenPattern = /^clrz_[A-Za-z0-9_-]{43}$/;
const scopeSchema = z.array(z.enum(["finance:read", "finance:write"])).min(1).max(2);

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function tokenHash(token: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", textEncoder.encode(token));
  return base64url(new Uint8Array(hash));
}

export function newToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `clrz_${base64url(bytes)}`;
}

export async function authenticate(request: Request, db: D1Database): Promise<Actor | null> {
  const authorization = request.headers.get("authorization");
  if (authorization) {
    const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
    if (!match || !tokenPattern.test(match[1])) return null;
    const row = await db
      .prepare("SELECT id, owner, scopes, expires_at, revoked_at FROM finance_api_tokens WHERE token_hash = ?")
      .bind(await tokenHash(match[1]))
      .first<TokenRow>();
    if (!row || row.revoked_at !== null || (row.expires_at !== null && row.expires_at <= Date.now())) return null;
    let storedScopes: unknown;
    try { storedScopes = JSON.parse(row.scopes); } catch { return null; }
    const scopes = scopeSchema.safeParse(storedScopes);
    if (!scopes.success) return null;
    await db.prepare("UPDATE finance_api_tokens SET last_used_at = ? WHERE id = ?").bind(Date.now(), row.id).run();
    return { owner: row.owner, kind: "bearer", scopes: new Set(scopes.data) };
  }

  const owner = request.headers.get("oai-authenticated-user-id");
  return owner ? { owner, kind: "session", scopes: new Set(["finance:read", "finance:write"]) } : null;
}

export function requireScope(actor: Actor, scope: "finance:read" | "finance:write") {
  if (!actor.scopes.has(scope)) throw new HttpError(403, "Este token não possui a permissão necessária.");
}

export function requireSession(actor: Actor) {
  if (actor.kind !== "session") throw new HttpError(403, "Gerencie tokens pela sua sessão do Clareza, não por outro token.");
}

export function requireSameOrigin(request: Request, url: URL, actor: Actor) {
  const origin = request.headers.get("origin");
  if (actor.kind === "session" && (!origin || origin !== url.origin || request.headers.get("sec-fetch-site") === "cross-site")) {
    throw new HttpError(403, "Origem não autorizada.");
  }
  if (actor.kind === "bearer" && origin && origin !== url.origin) throw new HttpError(403, "Origem não autorizada.");
}

export class HttpError extends Error {
  constructor(public code: number, message: string) { super(message); }
}
