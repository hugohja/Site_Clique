import type { Account, Conversation } from "@/lib/types";
import { isAdminAccount } from "@/lib/admin";
import { accountRepository, conversationRepository } from "@/lib/data";
import { currentAccount } from "@/lib/auth";

export type ViewerRole = "cliente" | "profissional" | "admin" | null;

/**
 * Papel de quem está vendo a conversa, resolvido pela SESSÃO (não pela URL).
 * É o que garante que só o cliente vê o código de confirmação e que cada ação
 * (propor, aceitar, pagar, concluir, disputar) seja feita pela parte certa.
 */
export function viewerRoleFor(account: Account | null, conv: Conversation): ViewerRole {
  if (!account) return null;
  if (account.clientId && account.clientId === conv.clientId) return "cliente";
  if (account.professionalId && account.professionalId === conv.professionalId) return "profissional";
  if (isAdminAccount(account)) return "admin";
  return null;
}

/** Carrega a conversa e resolve o papel do usuário logado (para as rotas de ação). */
export async function resolveConversationViewer(
  id: string
): Promise<{ conversation: Conversation | null; role: ViewerRole }> {
  const conversation = await conversationRepository.getById(id);
  if (!conversation) return { conversation: null, role: null };
  const account = await currentAccount((aid) => accountRepository.getById(aid));
  return { conversation, role: viewerRoleFor(account, conversation) };
}
