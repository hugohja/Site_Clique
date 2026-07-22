import { conversationRepository } from "@/lib/data";
import type { Conversation } from "@/lib/types";

/**
 * Ponto ÚNICO de integração de pagamento.
 *
 * O valor cobrado vem SEMPRE da proposta aceita registrada na conversa —
 * esta função não recebe valor de fora, o que impede pagamento com valor
 * diferente do fechado na plataforma.
 *
 * FASE ATUAL: pagamento simulado — confirma na hora e libera o contato.
 *
 * FASE 3 (gateway real PIX/cartão com split): trocar apenas o corpo desta
 * função — criar a cobrança no gateway pelo valor de conversation.proposal
 * e retornar os dados do checkout; a transição pagamento_confirmado →
 * contato_liberado passa a acontecer no webhook de confirmação do gateway,
 * que chama as mesmas duas operações do repositório usadas aqui.
 */
export async function confirmarPagamento(conversationId: string): Promise<Conversation | null> {
  const paid = await conversationRepository.setPaymentConfirmed(conversationId);
  if (!paid) return null;
  return conversationRepository.releaseContact(conversationId);
}

/**
 * Cobrança MANUAL (PIX na chave da Clique): o cliente informa que pagou e a
 * conversa vai pra "pagamento_confirmado" — aguardando a Clique CONFERIR o
 * recebimento. O contato NÃO é liberado aqui; isso só acontece quando o admin
 * confirma (releaseContact), evitando que alguém libere o contato sem pagar.
 */
export async function informarPagamento(conversationId: string): Promise<Conversation | null> {
  return conversationRepository.setPaymentConfirmed(conversationId);
}

/** Admin confirma que o PIX caiu → libera o contato e gera o código de custódia. */
export async function confirmarRecebimento(conversationId: string): Promise<Conversation | null> {
  return conversationRepository.releaseContact(conversationId);
}
