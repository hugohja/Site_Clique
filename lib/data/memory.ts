import { randomUUID } from "node:crypto";
import type {
  ChatMessage,
  Conversation,
  ConversationInput,
  PortfolioItem,
  Professional,
  ProfessionalInput,
} from "@/lib/types";
import { COMMISSION_RATE } from "@/lib/types";
import { SEED_PROFESSIONALS } from "./seed";
import type {
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
  __clicaConversations?: Conversation[];
};

function store(): Professional[] {
  if (!g.__clicaStore) {
    g.__clicaStore = SEED_PROFESSIONALS.map((p) => ({ ...p }));
  }
  return g.__clicaStore;
}

function conversations(): Conversation[] {
  if (!g.__clicaConversations) {
    g.__clicaConversations = [];
  }
  return g.__clicaConversations;
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  let slug = base || "profissional";
  let n = 2;
  const all = store();
  while (all.some((p) => p.id === slug)) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

function placeholderPortfolio(): PortfolioItem[] {
  const aspects: PortfolioItem["aspect"][] = ["wide", "tall", "square"];
  const seed = store().length + 11;
  return Array.from({ length: 6 }, (_, i) => ({
    id: `p${seed}-${i}`,
    label: `IMG_${((seed * 977 + i * 341) % 9000) + 1000}.RAW`,
    tone: (seed + i) % 6,
    aspect: aspects[(seed + i * 2) % 3],
  }));
}

export const memoryRepository: ProfessionalRepository = {
  async list(filters: ProfessionalFilters = {}) {
    let result = store().slice();
    if (filters.city) {
      result = result.filter((p) => p.city === filters.city);
    }
    if (filters.type) {
      result = result.filter((p) => p.type === filters.type);
    }
    if (filters.eventType) {
      result = result.filter((p) => p.specialties.includes(filters.eventType as never));
    }
    // Ordem neutra (data de cadastro): sem camada de destaque ou priorização.
    return result.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  async getById(id: string) {
    return store().find((p) => p.id === id) ?? null;
  },

  async create(input: ProfessionalInput) {
    const { portfolioUrls, ...fields } = input;
    const uploaded: PortfolioItem[] = (portfolioUrls ?? []).map((url, i) => ({
      id: `up-${Date.now()}-${i}`,
      label: `IMG_${1000 + i}.JPG`,
      tone: i % 6,
      aspect: (["wide", "square", "tall"] as const)[i % 3],
      url,
    }));
    const professional: Professional = {
      ...fields,
      id: slugify(input.name),
      rating: 0,
      reviewCount: 0,
      responseTimeHours: null,
      portfolio: uploaded.length > 0 ? uploaded : placeholderPortfolio(),
      createdAt: new Date().toISOString(),
    };
    store().push(professional);
    return professional;
  },
};

function systemMessage(text: string): ChatMessage {
  return { id: randomUUID(), sender: "sistema", text, filtered: false, createdAt: new Date().toISOString() };
}

export const memoryConversationRepository: ConversationRepository = {
  async create(input: ConversationInput & { firstMessage: ChatMessage }) {
    const conversation: Conversation = {
      // UUID: o link da conversa não pode ser adivinhável (não há login ainda).
      id: randomUUID(),
      professionalId: input.professionalId,
      clientName: input.clientName,
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
    conversation.messages.push(
      systemMessage(`Proposta enviada: R$ ${amount.toLocaleString("pt-BR")}`)
    );
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
      systemMessage(
        `Pagamento de R$ ${conversation.proposal.amount.toLocaleString("pt-BR")} confirmado`
      )
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
