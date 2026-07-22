import { randomInt, randomUUID } from "node:crypto";
import type {
  Account,
  ChatMessage,
  Client,
  ClientInput,
  Conversation,
  ConversationInput,
  IdentityRecord,
  PortfolioItem,
  Professional,
  ProfessionalInput,
  VerificationStatus,
} from "@/lib/types";
import { COMMISSION_RATE } from "@/lib/types";
import { SEED_PROFESSIONALS } from "./seed";
import type {
  AccountRepository,
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
  __clicaAccounts?: Account[];
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

function accounts(): Account[] {
  if (!g.__clicaAccounts) g.__clicaAccounts = [];
  return g.__clicaAccounts;
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
    const hasCover = input.portfolio.some((ph) => ph.cover);
    const portfolio: PortfolioItem[] = input.portfolio.map((ph, i) => ({
      id: `up-${Date.now()}-${i}`,
      label: `IMG_${1000 + i}.JPG`,
      aspect: ph.aspect,
      focus: ph.focus || "50% 50%",
      // Garante uma capa: se ninguém marcou, a primeira vira capa.
      cover: ph.cover || (!hasCover && i === 0),
      url: ph.url,
    }));
    const professional: Professional = {
      id: slugify(input.name, (id) => store().some((p) => p.id === id)),
      name: input.name,
      city: input.city,
      type: input.type,
      specialties: input.specialties,
      whatsapp: input.whatsapp,
      email: input.email,
      payoutPixKey: null,
      profilePhotoUrl: input.profilePhotoUrl,
      bio: input.bio,
      rating: 0,
      reviewCount: 0,
      noShowCount: 0,
      responseTimeHours: null,
      portfolio,
      identity: buildIdentity(input),
      createdAt: new Date().toISOString(),
    };
    store().push(professional);
    return professional;
  },

  async update(id, patch) {
    const pro = store().find((p) => p.id === id);
    if (!pro) return null;
    if (patch.name !== undefined) pro.name = patch.name;
    if (patch.city !== undefined) pro.city = patch.city;
    if (patch.bio !== undefined) pro.bio = patch.bio;
    if (patch.specialties !== undefined) pro.specialties = patch.specialties;
    if (patch.profilePhotoUrl !== undefined) pro.profilePhotoUrl = patch.profilePhotoUrl;
    if (patch.payoutPixKey !== undefined) pro.payoutPixKey = patch.payoutPixKey;
    return pro;
  },

  async replacePortfolio(id, items) {
    const pro = store().find((p) => p.id === id);
    if (!pro) return null;
    const hasCover = items.some((it) => it.cover);
    pro.portfolio = items.map((it, i) => ({
      id: `up-${Date.now()}-${i}`,
      label: `IMG_${1000 + i}.JPG`,
      aspect: "square",
      focus: it.focus || "50% 50%",
      cover: it.cover || (!hasCover && i === 0),
      url: it.url,
    }));
    return pro;
  },

  async listByStatus(status: VerificationStatus) {
    return store()
      .filter((p) => p.identity.status === status)
      .sort((a, b) => a.identity.submittedAt.localeCompare(b.identity.submittedAt));
  },

  async setVerificationStatus(id: string, status: VerificationStatus) {
    const pro = store().find((p) => p.id === id);
    if (!pro) return null;
    pro.identity.status = status;
    return pro;
  },

  async remove(id: string) {
    const arr = store();
    const i = arr.findIndex((p) => p.id === id);
    if (i >= 0) arr.splice(i, 1);
  },

  async registerNoShow(id: string) {
    const pro = store().find((p) => p.id === id);
    if (!pro) return null;
    pro.noShowCount += 1;
    return pro;
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

  async list() {
    return [...clients()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  },

  async listByStatus(status: VerificationStatus) {
    return clients()
      .filter((c) => c.identity.status === status)
      .sort((a, b) => a.identity.submittedAt.localeCompare(b.identity.submittedAt));
  },

  async update(id, patch) {
    const c = clients().find((x) => x.id === id);
    if (!c) return null;
    if (patch.name !== undefined) c.name = patch.name;
    if (patch.city !== undefined) c.city = patch.city;
    if (patch.profilePhotoUrl !== undefined) c.profilePhotoUrl = patch.profilePhotoUrl;
    return c;
  },

  async setVerificationStatus(id: string, status: VerificationStatus) {
    const c = clients().find((x) => x.id === id);
    if (!c) return null;
    c.identity.status = status;
    return c;
  },

  async remove(id: string) {
    const arr = clients();
    const i = arr.findIndex((c) => c.id === id);
    if (i >= 0) arr.splice(i, 1);
  },
};

export const memoryAccountRepository: AccountRepository = {
  async getById(id: string) {
    return accounts().find((a) => a.id === id) ?? null;
  },

  async getByEmail(email: string) {
    const e = email.trim().toLowerCase();
    return accounts().find((a) => a.email === e) ?? null;
  },

  async create(input) {
    const account: Account = {
      id: randomUUID(),
      role: input.role,
      email: input.email.trim().toLowerCase(),
      passwordHash: input.passwordHash,
      professionalId: input.professionalId ?? null,
      clientId: input.clientId ?? null,
      createdAt: new Date().toISOString(),
    };
    accounts().push(account);
    return account;
  },

  async updateEmail(id: string, email: string) {
    const account = accounts().find((a) => a.id === id);
    if (!account) return null;
    account.email = email.trim().toLowerCase();
    return account;
  },

  async updatePassword(id: string, passwordHash: string) {
    const account = accounts().find((a) => a.id === id);
    if (!account) return null;
    account.passwordHash = passwordHash;
    return account;
  },

  async deleteByProfessionalId(professionalId: string) {
    g.__clicaAccounts = accounts().filter((a) => a.professionalId !== professionalId);
  },

  async deleteByClientId(clientId: string) {
    g.__clicaAccounts = accounts().filter((a) => a.clientId !== clientId);
  },
};

function systemMessage(text: string): ChatMessage {
  return { id: randomUUID(), sender: "sistema", text, filtered: false, createdAt: new Date().toISOString() };
}

/** Código de confirmação do evento: 4 dígitos aleatórios (só o cliente vê). */
function newConfirmationCode(): string {
  return String(randomInt(1000, 10000));
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
      confirmationCode: null,
      paidOutAt: null,
      clientLastReadAt: null,
      proLastReadAt: null,
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
    conversation.messages.push(systemMessage(`Proposta enviada: R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`));
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
        `Proposta de R$ ${conversation.proposal.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} aceita pelo cliente — pagamento liberado`
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
      systemMessage(`Pagamento de R$ ${conversation.proposal.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} confirmado`)
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
      conversation.confirmationCode = newConfirmationCode();
      conversation.messages.push(
        systemMessage("Pagamento em custódia. Contato liberado — combinem o evento. No dia, o cliente passa o código de confirmação ao profissional.")
      );
    }
    return conversation;
  },

  async confirmCompletion(conversationId: string, code: string) {
    const conversation = conversations().find((c) => c.id === conversationId);
    if (!conversation) return null;
    // Só conclui a partir da custódia, com o código certo.
    if (conversation.status !== "contato_liberado") return conversation;
    if (!conversation.confirmationCode || code.trim() !== conversation.confirmationCode) {
      return conversation;
    }
    conversation.status = "concluido";
    conversation.messages.push(
      systemMessage("Código validado no evento — serviço concluído e pagamento liberado ao profissional.")
    );
    return conversation;
  },

  async reportNoShow(conversationId: string) {
    const conversation = conversations().find((c) => c.id === conversationId);
    if (!conversation) return null;
    if (conversation.status !== "contato_liberado") return conversation;
    conversation.status = "em_disputa";
    conversation.messages.push(
      systemMessage("Cliente reportou não comparecimento. Em análise pela Clique.")
    );
    return conversation;
  },

  async resolveDispute(conversationId: string, outcome: "reembolsar" | "liberar") {
    const conversation = conversations().find((c) => c.id === conversationId);
    if (!conversation) return null;
    if (conversation.status !== "em_disputa") return conversation;
    if (outcome === "reembolsar") {
      conversation.status = "reembolsado";
      conversation.messages.push(systemMessage("Disputa resolvida: valor reembolsado ao cliente."));
    } else {
      conversation.status = "concluido";
      conversation.messages.push(systemMessage("Disputa resolvida: pagamento liberado ao profissional."));
    }
    return conversation;
  },

  async listForClient(clientId: string) {
    return conversations()
      .filter((c) => c.clientId === clientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listForProfessional(professionalId: string) {
    return conversations()
      .filter((c) => c.professionalId === professionalId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listDisputes() {
    return conversations()
      .filter((c) => c.status === "em_disputa")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  async listPendingPaymentConfirmations() {
    return conversations()
      .filter((c) => c.status === "pagamento_confirmado")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  async listPendingPayouts() {
    return conversations()
      .filter((c) => c.status === "concluido" && !c.paidOutAt)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  async markPaidOut(conversationId: string) {
    const conversation = conversations().find((c) => c.id === conversationId);
    if (!conversation) return null;
    if (conversation.status !== "concluido" || conversation.paidOutAt) return conversation;
    conversation.paidOutAt = new Date().toISOString();
    conversation.messages.push(systemMessage("Repasse ao profissional realizado pela Clique."));
    return conversation;
  },

  async markRead(conversationId: string, role: "cliente" | "profissional") {
    const conversation = conversations().find((c) => c.id === conversationId);
    if (!conversation) return;
    const now = new Date().toISOString();
    if (role === "cliente") conversation.clientLastReadAt = now;
    else conversation.proLastReadAt = now;
  },
};
