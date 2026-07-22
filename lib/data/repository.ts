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
  Review,
  ReviewInput,
  VerificationStatus,
} from "@/lib/types";
import type { ProSort } from "@/lib/ranking";

export interface ProfessionalFilters {
  city?: string;
  eventType?: EventType | string;
  type?: ProfessionalType | string;
  /** Ordenação da busca (padrão: relevância). */
  sort?: ProSort;
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
    patch: {
      name?: string;
      city?: string;
      bio?: string;
      specialties?: EventType[];
      profilePhotoUrl?: string;
      payoutPixKey?: string | null;
    }
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
  /** Registra um não comparecimento confirmado (sobe noShowCount). */
  registerNoShow(id: string): Promise<Professional | null>;
  /** Atualiza a nota média e a contagem de avaliações (recalculadas a cada review). */
  updateRating(id: string, rating: number, reviewCount: number): Promise<Professional | null>;
  /** Já existe uma conta PROFISSIONAL com este CPF? (só dígitos) */
  existsByCpf(cpf: string): Promise<boolean>;
  /** Define as datas de indisponibilidade (agenda) do profissional. */
  setUnavailableDates(id: string, dates: string[]): Promise<Professional | null>;
}

export interface ClientRepository {
  getById(id: string): Promise<Client | null>;
  create(input: ClientInput): Promise<Client>;
  /** Todos os clientes (uso do admin). */
  list(): Promise<Client[]>;
  listByStatus(status: VerificationStatus): Promise<Client[]>;
  /** Edição do perfil do cliente (admin): nome, cidade, foto. */
  update(
    id: string,
    patch: { name?: string; city?: string | null; profilePhotoUrl?: string }
  ): Promise<Client | null>;
  setVerificationStatus(id: string, status: VerificationStatus): Promise<Client | null>;
  remove(id: string): Promise<void>;
  /** Já existe uma conta CLIENTE com este CPF? (só dígitos) */
  existsByCpf(cpf: string): Promise<boolean>;
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
   * Envia (ou substitui) a proposta de valor estruturada. `by` é quem está
   * propondo — profissional (orçamento inicial) ou cliente (contraproposta).
   * Só permitido antes do aceite (conversando / proposta_enviada).
   */
  sendProposal(
    conversationId: string,
    amount: number,
    by: "cliente" | "profissional"
  ): Promise<Conversation | null>;
  /** O lado que NÃO fez a proposta vigente aceita (→ proposta_aceita). */
  acceptProposal(conversationId: string): Promise<Conversation | null>;
  /**
   * Registra o pagamento SEMPRE pelo valor da proposta aceita registrada —
   * não recebe valor de fora. Só permitido em proposta_aceita.
   */
  setPaymentConfirmed(conversationId: string): Promise<Conversation | null>;
  /**
   * Libera o contato pros dois lados e coloca o dinheiro em custódia. Gera o
   * código de confirmação (só o cliente vê). Só após pagamento_confirmado.
   */
  releaseContact(conversationId: string): Promise<Conversation | null>;
  /** Profissional conclui informando o código do cliente (contato_liberado → concluido). */
  confirmCompletion(conversationId: string, code: string): Promise<Conversation | null>;
  /** Cliente reporta não comparecimento (contato_liberado → em_disputa). */
  reportNoShow(conversationId: string): Promise<Conversation | null>;
  /** Admin resolve a disputa: "reembolsar" (→ reembolsado) ou "liberar" (→ concluido). */
  resolveDispute(
    conversationId: string,
    outcome: "reembolsar" | "liberar"
  ): Promise<Conversation | null>;
  /** Inbox: conversas de um cliente / de um profissional (mais recentes primeiro). */
  listForClient(clientId: string): Promise<Conversation[]>;
  listForProfessional(professionalId: string): Promise<Conversation[]>;
  /** Admin: conversas em disputa (não comparecimento reportado). */
  listDisputes(): Promise<Conversation[]>;
  /** Admin: cobrança manual — cliente informou o PIX, aguardando conferência. */
  listPendingPaymentConfirmations(): Promise<Conversation[]>;
  /** Admin: concluídas cujo repasse ao profissional ainda não foi marcado como feito. */
  listPendingPayouts(): Promise<Conversation[]>;
  /** Admin marca o repasse (PIX manual) como feito — grava paidOutAt. */
  markPaidOut(conversationId: string): Promise<Conversation | null>;
  /** Marca a conversa como lida por um dos lados (ao abrir) — zera o "não lida". */
  markRead(conversationId: string, role: "cliente" | "profissional"): Promise<void>;
}

export interface ReviewRepository {
  create(input: ReviewInput): Promise<Review>;
  /** Avaliações de um profissional (mais recentes primeiro). */
  listByProfessional(professionalId: string): Promise<Review[]>;
  /** A avaliação de uma conversa, se já existir (impede avaliar duas vezes). */
  getByConversation(conversationId: string): Promise<Review | null>;
}
