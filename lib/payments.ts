import { conversationRepository } from "@/lib/data";
import type { Conversation } from "@/lib/types";

/**
 * Ponto ÚNICO de integração de pagamento.
 *
 * FASE ATUAL: pagamento simulado — confirma na hora e libera o contato.
 *
 * FASE 3 (gateway real PIX/cartão com split): trocar apenas o corpo desta
 * função — criar a cobrança no gateway e retornar os dados do checkout; a
 * transição pagamento_confirmado → contato_liberado passa a acontecer no
 * webhook de confirmação do gateway, que chama as mesmas duas operações do
 * repositório usadas aqui. Nenhuma outra parte do fluxo muda.
 */
export async function confirmarPagamento(
  conversationId: string,
  agreedPrice: number
): Promise<Conversation | null> {
  const paid = await conversationRepository.setPaymentConfirmed(conversationId, agreedPrice);
  if (!paid) return null;
  return conversationRepository.releaseContact(conversationId);
}
