import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Account } from "@/lib/types";
import { isSupabaseConfigured, q, sbDelete, sbInsert, sbSelect } from "@/lib/supabase";

/**
 * Autenticação.
 *
 * Senhas são guardadas como hash scrypt (salt aleatório por conta) — a senha
 * em claro nunca é persistida. As sessões são tokens opacos num cookie
 * httpOnly. Com Supabase configurado, ficam na tabela `sessions` (persistem e
 * funcionam em ambiente serverless com várias instâncias); sem ele, ficam num
 * mapa em memória (protótipo).
 */

export const SESSION_COOKIE = "clica_session";

const g = globalThis as unknown as { __clicaSessions?: Map<string, string> };
function sessions(): Map<string, string> {
  if (!g.__clicaSessions) g.__clicaSessions = new Map();
  return g.__clicaSessions;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, derivedHex] = stored.split(":");
  if (!salt || !derivedHex) return false;
  const derived = Buffer.from(derivedHex, "hex");
  const candidate = scryptSync(password, salt, 64);
  return derived.length === candidate.length && timingSafeEqual(derived, candidate);
}

/** Cria uma sessão para a conta e devolve o token (guardar no cookie). */
export async function createSession(accountId: string): Promise<string> {
  const token = randomUUID() + randomBytes(16).toString("hex");
  if (isSupabaseConfigured()) {
    await sbInsert("sessions", { token, account_id: accountId });
  } else {
    sessions().set(token, accountId);
  }
  return token;
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  if (isSupabaseConfigured()) {
    await sbDelete("sessions", [q.eq("token", token)]).catch(() => {});
  } else {
    sessions().delete(token);
  }
}

export async function accountIdForToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  if (isSupabaseConfigured()) {
    const rows = await sbSelect<{ account_id: string }>("sessions", [
      q.select("account_id"),
      q.eq("token", token),
      q.limit(1),
    ]);
    return rows[0]?.account_id ?? null;
  }
  return sessions().get(token) ?? null;
}

/** Lê o cookie de sessão (server components / route handlers) e resolve a conta. */
export async function currentAccount(
  lookup: (id: string) => Promise<Account | null> | Account | null
): Promise<Account | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const id = await accountIdForToken(token);
  if (!id) return null;
  return lookup(id);
}
