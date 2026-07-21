import type {
  Account,
  ChatMessage,
  Client,
  ClientInput,
  Conversation,
  ConversationInput,
  EventType,
  Professional,
  ProfessionalInput,
  ProfessionalType,
  VerificationStatus,
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
  /** Edição de perfil pelo próprio profissional. */
  update(
    id: string,
    patch: { name?: string; city?: string; bio?: string; specialties?: EventType[]; profilePhotoUrl?: string }
  ): Promise<Professional | null>;
  /** Substitui todo o portfólio (usado na edição: add/remove/reordenar/enquadrar). */
  replacePortfolio(
    id: string,
    items: { url: string; focus: string; cover: boolean }[]
  ): Promise<Professional | null>;
  /** Moderação: cadastros aguardando verificação de identidade. */
  listByStatus(status: VerificationStatus): Promise<Professional[]>;
  setVerificationStatus(id: string, status: VerificationStatus): Promise<Professional | null>;
  remove(id: string): Promise<void>;
}

export interface ClientRepository {
  getById(id: string): Promise<Client | null>;
  create(input: ClientInput): Promise<Client>;
  listByStatus(status: VerificationStatus): Promise<Client[]>;
  setVerificationStatus(id: string, status: VerificationStatus): Promise<Client | null>;
  remove(id: string): Promise<void>;
}

export interface AccountRepository {
  getById(id: string): Promise<Account | null>;
  getByEmail(email: string): Promise<Account | null>;
  create(input: {
    role: Account["role"];
    email: string;
    passwordHash: string;
    professionalId?: string;
    clientId?: string;
  }): Promise<Account>;
  updateEmail(id: string, email: string): Promise<Account | null>;
  updatePassword(id: string, passwordHash: string): Promise<Account | null>;
  /** Remove a conta ligada a um perfil (usado ao recusar um cadastro). */
  deleteByProfessionalId(professionalId: string): Promise<void>;
  deleteByClientId(clientId: string): Promise<void>;
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
