import type {
  ChatMessage,
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

export interface ConversationRepository {
  create(input: ConversationInput & { firstMessage: ChatMessage }): Promise<Conversation>;
  getById(id: string): Promise<Conversation | null>;
  addMessage(conversationId: string, message: ChatMessage): Promise<Conversation | null>;
  /** Registra o pagamento (status pagamento_confirmado + valor fechado). */
  setPaymentConfirmed(conversationId: string, agreedPrice: number): Promise<Conversation | null>;
  /** Libera o contato pros dois lados (status contato_liberado). */
  releaseContact(conversationId: string): Promise<Conversation | null>;
}
