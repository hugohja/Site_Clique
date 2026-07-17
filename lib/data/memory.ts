import { randomUUID } from "node:crypto";
import type {
  ChatMessage,
  Client,
  ClientInput,
  Conversation,
  ConversationInput,
  IdentityRecord,
  PortfolioItem,
  Professional,
  ProfessionalInput,
} from "@/lib/types";
import { COMMISSION_RATE } from "@/lib/types";
import { SEED_PROFESSIONALS } from "./seed";
import type {
  ClientRepository,
  ConversationRepository,
  ProfessionalFilters,
  ProfessionalRepository,
} from "./repository";

/**
 * Implementação em memória do repositório (fase 1: sem banco).
 *
 * O estado vive em globalThis para sobreviver ao hot-reload em dev. Cadastros
 * feitos pelo formulário existem enquanto o processo do servidor viver — é o
 * comportamento esperado do protótipo; persistência real chega na fase 2.
 */

const g = globalThis as unknown as {
  __clicaStore?: Professional[];
  __clicaClients?: Client[];
  __clicaConversations?: Conversation[];
};

function store(): Professional[] {
  if (!g.__clicaStore) {
    g.__clicaStore = SEED_PROFESSIONALS.map((p) => ({ ...p }));
  }
  return g.__clicaStore;
}

function clients(): Client[] {
  if (!g.__clicaClients) g.__clicaClients = [];
  return g.__clicaClients;
}

function conversations(): Conversation[] {
  if (!g.__clicaConversations) g.__clicaConversations = [];
  return g.__clicaConversations;
}

function slugify(name: string, taken: (id: string) => boolean): string {
  const base =
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "perfil";
  let slug = base;
  let n = 2;
  while (taken(slug)) slug = `${base}-${n++}`;
  return slug;
}

/** Monta o registro de identidade (privado) comum a profissional e cliente. */
function buildIdentity(input: {
  cpf: string;
  gender: IdentityRecord["gender"];
  birthDate: string | null;
  documentType: IdentityRecord["documentType"];
  documentPhotoUrl: string;
}): IdentityRecord {
  return {
    cpf: input.cpf,
    gender: input.gender,
    birthDate: input.birthDate,
    documentType: input.documentType,
    documentPhotoUrl: input.documentPhotoUrl,
    // Documento enviado entra em análise; aprovação manual vem na fase 2.
    status: "em_analise",
    submittedAt: new Date().toISOString(),
  };
}

export const memoryRepository: ProfessionalRepository = {
  async list(filters: ProfessionalFilters = {}) {
    let result = store().slice();
    if (filters.city) result = result.filter((p) => p.city === filters.city);
    if (filters.type) result = result.filter((p) => p.type === filters.type);
    if (filters.eventType)
      result = result.filter((p) => p.specialties.includes(filters.eventType as never));
    // Ordem neutra (data de cadastro): sem camada de destaque ou priorização.
    return result.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  async getById(id: string) {
    return store().find((p) => p.id === id) ?? null;
  },

  async create(input: ProfessionalInput) {
    const portfolio: PortfolioItem[] = input.portfolioUrls.map((url, i) => ({
      id: `up-${Date.now()}-${i}`,
      label: `IMG_${1000 + i}.JPG`,
      tone: i % 6,
      aspect: (["wide", "square", "tall"] as const)[i % 3],
      url,
    }));
    const professional: Professional = {
      id: slugify(input.name, (id) => store().some((p) => p.id === id)),
      name: input.name,
      city: input.city,
      type: input.type,
      specialties: input.specialties,
      priceFrom: input.priceFrom,
      whatsapp: input.whatsapp,
      email: input.email,
      profilePhotoUrl: input.profilePhotoUrl,
      bio: input.bio,
      rating: 0,
      reviewCount: 0,
      responseTimeHours: null,
      portfolio,
      identity: buildIdentity(input),
      createdAt: new Date().toISOString(),
    };
    store().push(professional);
    return professional;
  },
};

export const memoryClientRepository: ClientRepository = {
  async getById(id: string) {
    return clients().find((c) => c.id === id) ?? null;
  },

  async create(input: ClientInput) {
    const client: Client = {
      id: slugify(input.name, (id) => clients().some((c) => c.id === id)),
      name: input.name,
      city: input.city,
      whatsapp: input.whatsapp,
      email: input.email,
      profilePhotoUrl: input.profilePhotoUrl,
      identity: buildIdentity(input),
      createdAt: new Date().toISOString(),
    };
    clients().push(client);
    return client;
  },
};

function systemMessage(text: string): ChatMessage {
  return { id: randomUUID(), sender: "sistema", text, filtered: false, createdAt: new Date().toISOString() };
}

export const memoryConversationRepository: ConversationRepository = {
  async create(input) {
    const conversation: Conversation = {
      // UUID: o link da conversa não pode ser adivinhável (não há login ainda).
      id: randomUUID(),
      professionalId: input.professionalId,
      clientId: input.clientId,
      clientName: input.clientName,
      clientWhatsapp: input.clientWhatsapp,
      eventType: input.eventType,
      eventDate: input.eventDate,
      eventLocation: input.eventLocation,
      status: "conversando",
      proposal: null,
      agreedPrice: null,
      commissionRate: COMMISSION_RATE,
      messages: [input.firstMessage],
      createdAt: new Date().toISOString(),
    };
    conversations().push(conversation);
    return conversation;
  },

  async getById(id: string) {
    return conversations().find((c) => c.id === id) ?? null;
  },

  async addMessage(conversationId: string, message: ChatMessage) {
    const conversation = conversations().find((c) => c.id === conversationId);
    if (!conversation) return null;
    conversation.messages.push(message);
    return conversation;
  },

  async sendProposal(conversationId: string, amount: number) {
    const conversation = conversations().find((c) => c.id === conversationId);
    if (!conversation) return null;
    // Proposta só pode ser enviada/substituída antes do aceite.
    if (conversation.status !== "conversando" && conversation.status !== "proposta_enviada") {
      return conversation;
    }
    conversation.proposal = { amount, proposedAt: new Date().toISOString(), acceptedAt: null };
    conversation.status = "proposta_enviada";
    conversation.messages.push(systemMessage(`Proposta enviada: R$ ${amount.toLocaleString("pt-BR")}`));
    return conversation;
  },

  async acceptProposal(conversationId: string) {
    const conversation = conversations().find((c) => c.id === conversationId);
    if (!conversation) return null;
    // Aceite exige uma proposta enviada e ainda não aceita.
    if (conversation.status !== "proposta_enviada" || !conversation.proposal) {
      return conversation;
    }
    conversation.proposal.acceptedAt = new Date().toISOString();
    conversation.status = "proposta_aceita";
    conversation.messages.push(
      systemMessage(
        `Proposta de R$ ${conversation.proposal.amount.toLocaleString("pt-BR")} aceita pelo cliente — pagamento liberado`
      )
    );
    return conversation;
  },

  async setPaymentConfirmed(conversationId: string) {
    const conversation = conversations().find((c) => c.id === conversationId);
    if (!conversation) return null;
    // Pagamento SÓ existe sobre proposta aceita registrada — nunca por valor solto.
    if (conversation.status !== "proposta_aceita" || !conversation.proposal?.acceptedAt) {
      return conversation;
    }
    conversation.status = "pagamento_confirmado";
    conversation.agreedPrice = conversation.proposal.amount;
    conversation.messages.push(
      systemMessage(`Pagamento de R$ ${conversation.proposal.amount.toLocaleString("pt-BR")} confirmado`)
    );
    return conversation;
  },

  async releaseContact(conversationId: string) {
    const conversation = conversations().find((c) => c.id === conversationId);
    if (!conversation) return null;
    if (conversation.status !== "pagamento_confirmado" && conversation.status !== "contato_liberado") {
      // Contato só é liberado depois do pagamento — nunca antes.
      return conversation;
    }
    if (conversation.status === "pagamento_confirmado") {
      conversation.status = "contato_liberado";
      conversation.messages.push(systemMessage("Contato liberado pros dois lados"));
    }
    return conversation;
  },
};
