import { randomBytes, randomUUID } from "node:crypto";
import { isSupabaseConfigured, q, sbDelete, sbInsert, sbSelect } from "@/lib/supabase";

/**
 * Tokens de redefinição de senha ("esqueci minha senha").
 *
 * Mesmo modelo das sessões: token opaco, uso único, com validade. Com Supabase,
 * ficam na tabela `password_resets`; sem ele, num mapa em memória (protótipo).
 * O token só chega ao usuário por e-mail — nunca é devolvido numa resposta.
 */

const TTL_MS = 60 * 60 * 1000; // 1 hora

const g = globalThis as unknown as {
  __clicaPasswordResets?: Map<string, { accountId: string; expiresAt: number }>;
};
function store(): Map<string, { accountId: string; expiresAt: number }> {
  if (!g.__clicaPasswordResets) g.__clicaPasswordResets = new Map();
  return g.__clicaPasswordResets;
}

/** Cria um token de redefinição para a conta e devolve o token. */
export async function createPasswordReset(accountId: string): Promise<string> {
  const token = randomUUID() + randomBytes(16).toString("hex");
  const expiresAt = Date.now() + TTL_MS;
  if (isSupabaseConfigured()) {
    await sbInsert("password_resets", {
      token,
      account_id: accountId,
      expires_at: new Date(expiresAt).toISOString(),
    });
  } else {
    store().set(token, { accountId, expiresAt });
  }
  return token;
}

/**
 * Valida e CONSOME o token (uso único). Devolve o accountId se o token existe,
 * não expirou e não foi usado; senão null. Em qualquer caso o token é removido.
 */
export async function consumePasswordReset(token: string): Promise<string | null> {
  if (!token) return null;
  if (isSupabaseConfigured()) {
    const rows = await sbSelect<{ account_id: string; expires_at: string }>("password_resets", [
      q.select("account_id,expires_at"),
      q.eq("token", token),
      q.limit(1),
    ]);
    await sbDelete("password_resets", [q.eq("token", token)]).catch(() => {});
    const row = rows[0];
    if (!row) return null;
    if (Date.parse(row.expires_at) < Date.now()) return null;
    return row.account_id;
  }
  const entry = store().get(token);
  store().delete(token);
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry.accountId;
}
