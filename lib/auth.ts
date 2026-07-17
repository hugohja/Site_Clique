import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Account } from "@/lib/types";

/**
 * Autenticação da fase de protótipo.
 *
 * Senhas são guardadas como hash scrypt (salt aleatório por conta) — a senha
 * em claro nunca é persistida. As sessões são tokens opacos num cookie
 * httpOnly, mapeados em memória. Na fase 2 (com banco), a mesma interface é
 * mantida trocando o mapa em memória por uma tabela de sessões.
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
export function createSession(accountId: string): string {
  const token = randomUUID() + randomBytes(16).toString("hex");
  sessions().set(token, accountId);
  return token;
}

export function destroySession(token: string | undefined): void {
  if (token) sessions().delete(token);
}

export function accountIdForToken(token: string | undefined): string | null {
  if (!token) return null;
  return sessions().get(token) ?? null;
}

/** Lê o cookie de sessão (server components / route handlers) e resolve a conta. */
export async function currentAccount(
  lookup: (id: string) => Promise<Account | null> | Account | null
): Promise<Account | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const id = accountIdForToken(token);
  if (!id) return null;
  return lookup(id);
}
