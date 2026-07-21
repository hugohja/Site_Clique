import type { Account } from "@/lib/types";

/**
 * Controle de acesso ao painel admin.
 *
 * Admins são definidos por e-mail na variável de ambiente ADMIN_EMAILS
 * (separados por vírgula). Uma conta logada cujo e-mail está na lista tem
 * acesso ao painel de moderação. Sem a env, ninguém é admin.
 */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

export function isAdminAccount(account: Account | null): boolean {
  return isAdminEmail(account?.email ?? null);
}
