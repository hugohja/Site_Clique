import type {
  ChatMessage,
  Client,
  ClientInput,
  Conversation,
  ConversationInput,
  EventType,
  Professional,
  ProfessionalInput,
  ProfessionalType,
} from "@/lib/types";

export interface ProfessionalFilters {
  city?: string;
  eventType?: EventType | string;
  type?: ProfessionalType | string;
}

/**
 * Contrato da camada de dados. A UI e as API routes só conhecem esta
 * interface — na fase 2, basta criar uma implementação Supabase/Postgres
 * e trocá-la em lib/data/index.ts. Nada mais muda.
 */
export interface ProfessionalRepository {
  list(filters?: ProfessionalFilters): Promise<Professional[]>;
  getById(id: string): Promise<Professional | null>;
  create(input: ProfessionalInput): Promise<Professional>;
}

export interface ClientRepository {
  getById(id: string): Promise<Client | null>;
  create(input: ClientInput): Promise<Client>;
}

export interface ConversationRepository {
  create(
    input: ConversationInput & { clientName: string; clientWhatsapp: string; firstMessage: ChatMessage }
  ): Promise<Conversation>;
  getById(id: string): Promise<Conversation | null>;
  addMessage(conversationId: string, message: ChatMessage): Promise<Conversation | null>;
  /**
   * Profissional envia (ou substitui) a proposta de valor estruturada.
   * Só permitido antes do aceite (conversando / proposta_enviada).
   */
  sendProposal(conversationId: string, amount: number): Promise<Conversation | null>;
  /** Cliente aceita a proposta vigente dentro da plataforma (→ proposta_aceita). */
  acceptProposal(conversationId: string): Promise<Conversation | null>;
  /**
   * Registra o pagamento SEMPRE pelo valor da proposta aceita registrada —
   * não recebe valor de fora. Só permitido em proposta_aceita.
   */
  setPaymentConfirmed(conversationId: string): Promise<Conversation | null>;
  /** Libera o contato pros dois lados. Só permitido após pagamento_confirmado. */
  releaseContact(conversationId: string): Promise<Conversation | null>;
}
