import { randomInt, randomUUID } from "node:crypto";
import type {
  Account,
  ChatMessage,
  Client,
  ClientInput,
  Conversation,
  ConversationStatus,
  DocumentType,
  Gender,
  IdentityRecord,
  PortfolioItem,
  Professional,
  ProfessionalInput,
  ProfessionalType,
  VerificationStatus,
} from "@/lib/types";
import { COMMISSION_RATE } from "@/lib/types";
import { q, sbDelete, sbInsert, sbSelect, sbUpdate } from "@/lib/supabase";
import type {
  AccountRepository,
  ClientRepository,
  ConversationRepository,
  ProfessionalFilters,
  ProfessionalRepository,
} from "./repository";

/**
 * Implementação Supabase/Postgres da camada de dados (fase 2).
 *
 * Espelha exatamente o comportamento de memory.ts — mesmas regras de slug,
 * registro de identidade e máquina de estados das conversas — trocando o
 * array em memória por tabelas. Selecionada em index.ts quando o Supabase
 * está configurado. O schema vive em supabase/schema.sql.
 */

// ---- Linhas do banco (snake_case) ----

interface IdentityRow {
  cpf: string;
  document_type: DocumentType;
  document_photo_url: string;
  gender: Gender | null;
  birth_date: string | null;
  status: VerificationStatus;
  submitted_at: string;
}

interface PortfolioRow {
  id: string;
  label: string;
  aspect: PortfolioItem["aspect"];
  focus: string | null;
  cover: boolean;
  url: string;
  position: number;
}

interface ProRow {
  id: string;
  name: string;
  city: string;
  type: ProfessionalType;
  specialties: string[] | null;
  price_from: number;
  whatsapp: string;
  email: string;
  payout_pix_key: string | null;
  profile_photo_url: string;
  bio: string;
  rating: number | null;
  review_count: number | null;
  no_show_count: number | null;
  response_time_hours: number | null;
  created_at: string;
  portfolio_items?: PortfolioRow[];
  professional_identities?: IdentityRow[] | IdentityRow | null;
}

interface ClientRow {
  id: string;
  name: string;
  city: string | null;
  whatsapp: string;
  email: string;
  profile_photo_url: string;
  created_at: string;
  client_identities?: IdentityRow[] | IdentityRow | null;
}

interface AccountRow {
  id: string;
  role: Account["role"];
  email: string;
  password_hash: string;
  professional_id: string | null;
  client_id: string | null;
  created_at: string;
}

interface ConversationRow {
  id: string;
  professional_id: string;
  client_id: string;
  client_name: string;
  client_whatsapp: string;
  event_type: string;
  event_date: string;
  event_location: string;
  status: ConversationStatus;
  proposal_amount: number | null;
  proposal_proposed_at: string | null;
  proposal_accepted_at: string | null;
  agreed_price: number | null;
  commission_rate: number;
  confirmation_code: string | null;
  paid_out_at: string | null;
  created_at: string;
  messages?: MessageRow[];
}

interface MessageRow {
  id: string;
  sender: ChatMessage["sender"];
  text: string;
  filtered: boolean;
  created_at: string;
}

// ---- Utilitários ----

const iso = (v: string): string => new Date(v).toISOString();
const now = (): string => new Date().toISOString();

/** Embed 1-1 do PostgREST pode vir como objeto ou array — normaliza. */
function one<T>(v: T[] | T | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

function fallbackIdentity(): IdentityRecord {
  return {
    cpf: "",
    documentType: "rg",
    documentPhotoUrl: "",
    gender: null,
    birthDate: null,
    status: "em_analise",
    submittedAt: now(),
  };
}

function toIdentity(r: IdentityRow | null): IdentityRecord {
  if (!r) return fallbackIdentity();
  return {
    cpf: r.cpf,
    documentType: r.document_type,
    documentPhotoUrl: r.document_photo_url,
    gender: r.gender,
    birthDate: r.birth_date,
    status: r.status,
    submittedAt: iso(r.submitted_at),
  };
}

function toProfessional(row: ProRow): Professional {
  const portfolio: PortfolioItem[] = (row.portfolio_items ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((p) => ({
      id: p.id,
      label: p.label,
      aspect: p.aspect,
      focus: p.focus || "50% 50%",
      cover: p.cover,
      url: p.url,
    }));
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    type: row.type,
    specialties: row.specialties ?? [],
    whatsapp: row.whatsapp,
    email: row.email,
    payoutPixKey: row.payout_pix_key ?? null,
    profilePhotoUrl: row.profile_photo_url,
    bio: row.bio,
    rating: row.rating ?? 0,
    reviewCount: row.review_count ?? 0,
    noShowCount: row.no_show_count ?? 0,
    responseTimeHours: row.response_time_hours ?? null,
    portfolio,
    identity: toIdentity(one(row.professional_identities)),
    createdAt: iso(row.created_at),
  };
}

function toClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    whatsapp: row.whatsapp,
    email: row.email,
    profilePhotoUrl: row.profile_photo_url,
    identity: toIdentity(one(row.client_identities)),
    createdAt: iso(row.created_at),
  };
}

function toAccount(row: AccountRow): Account {
  return {
    id: row.id,
    role: row.role,
    email: row.email,
    passwordHash: row.password_hash,
    professionalId: row.professional_id,
    clientId: row.client_id,
    createdAt: iso(row.created_at),
  };
}

function toMessage(r: MessageRow): ChatMessage {
  return { id: r.id, sender: r.sender, text: r.text, filtered: r.filtered, createdAt: iso(r.created_at) };
}

function toConversation(row: ConversationRow): Conversation {
  const messages = (row.messages ?? [])
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map(toMessage);
  return {
    id: row.id,
    professionalId: row.professional_id,
    clientId: row.client_id,
    clientName: row.client_name,
    clientWhatsapp: row.client_whatsapp,
    eventType: row.event_type,
    eventDate: row.event_date,
    eventLocation: row.event_location,
    status: row.status,
    proposal:
      row.proposal_amount != null
        ? {
            amount: row.proposal_amount,
            proposedAt: row.proposal_proposed_at ? iso(row.proposal_proposed_at) : now(),
            acceptedAt: row.proposal_accepted_at ? iso(row.proposal_accepted_at) : null,
          }
        : null,
    agreedPrice: row.agreed_price ?? null,
    commissionRate: row.commission_rate,
    confirmationCode: row.confirmation_code ?? null,
    paidOutAt: row.paid_out_at ? iso(row.paid_out_at) : null,
    messages,
    createdAt: iso(row.created_at),
  };
}

function slugBase(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "perfil"
  );
}

/** Gera um id-slug único checando a existência no banco. */
async function uniqueSlug(name: string, table: "professionals" | "clients"): Promise<string> {
  const base = slugBase(name);
  let slug = base;
  let n = 2;
  // Loop curto: em prática colide muito raramente.
  while ((await sbSelect<{ id: string }>(table, [q.select("id"), q.eq("id", slug), q.limit(1)])).length > 0) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

function identityInsert(
  ownerKey: "professional_id" | "client_id",
  ownerId: string,
  input: {
    cpf: string;
    gender: Gender | null;
    birthDate: string | null;
    documentType: DocumentType;
    documentPhotoUrl: string;
  }
): Record<string, unknown> {
  return {
    [ownerKey]: ownerId,
    cpf: input.cpf,
    document_type: input.documentType,
    document_photo_url: input.documentPhotoUrl,
    gender: input.gender,
    birth_date: input.birthDate,
    // Documento enviado entra em análise; aprovação manual vem no painel admin.
    status: "em_analise",
    submitted_at: now(),
  };
}

const PRO_SELECT = q.select("*,portfolio_items(*),professional_identities(*)");
const CLIENT_SELECT = q.select("*,client_identities(*)");
const CONV_SELECT = q.select("*,messages(*)");

// ---- Repositórios ----

export const supabaseRepository: ProfessionalRepository = {
  async list(filters: ProfessionalFilters = {}) {
    const pairs = [PRO_SELECT, q.order("created_at.asc")];
    if (filters.city) pairs.push(q.eq("city", filters.city));
    if (filters.type) pairs.push(q.eq("type", String(filters.type)));
    if (filters.eventType) pairs.push(q.contains("specialties", String(filters.eventType)));
    const rows = await sbSelect<ProRow>("professionals", pairs);
    return rows.map(toProfessional);
  },

  async getById(id: string) {
    const rows = await sbSelect<ProRow>("professionals", [PRO_SELECT, q.eq("id", id), q.limit(1)]);
    return rows[0] ? toProfessional(rows[0]) : null;
  },

  async create(input: ProfessionalInput) {
    const id = await uniqueSlug(input.name, "professionals");
    await sbInsert("professionals", {
      id,
      name: input.name,
      city: input.city,
      type: input.type,
      specialties: input.specialties,
      // Coluna preço mantida por compatibilidade; o valor é definido por evento
      // via proposta no chat, então não há mais "preço a partir de".
      price_from: 0,
      whatsapp: input.whatsapp,
      email: input.email,
      payout_pix_key: null,
      profile_photo_url: input.profilePhotoUrl,
      bio: input.bio,
      rating: 0,
      review_count: 0,
      no_show_count: 0,
      response_time_hours: null,
    });

    // Identidade + portfólio. Se algo falhar, remove o profissional pra não
    // deixar um perfil órfão (sem portfólio) aparecendo na busca.
    try {
      await sbInsert("professional_identities", identityInsert("professional_id", id, input));

      const hasCover = input.portfolio.some((ph) => ph.cover);
      const items = input.portfolio.map((ph, i) => ({
        id: `up-${randomUUID()}`,
        professional_id: id,
        label: `IMG_${1000 + i}.JPG`,
        aspect: ph.aspect,
        focus: ph.focus || "50% 50%",
        // Garante uma capa: se ninguém marcou, a primeira vira capa.
        cover: ph.cover || (!hasCover && i === 0),
        url: ph.url,
        position: i,
      }));
      if (items.length > 0) await sbInsert("portfolio_items", items);
    } catch (err) {
      await sbDelete("professionals", [q.eq("id", id)]).catch(() => {});
      throw err;
    }

    const created = await this.getById(id);
    if (!created) throw new Error("Falha ao criar o profissional.");
    return created;
  },

  async update(id, patch) {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.city !== undefined) row.city = patch.city;
    if (patch.bio !== undefined) row.bio = patch.bio;
    if (patch.specialties !== undefined) row.specialties = patch.specialties;
    if (patch.profilePhotoUrl !== undefined) row.profile_photo_url = patch.profilePhotoUrl;
    if (patch.payoutPixKey !== undefined) row.payout_pix_key = patch.payoutPixKey;
    if (Object.keys(row).length > 0) await sbUpdate("professionals", [q.eq("id", id)], row);
    return this.getById(id);
  },

  async replacePortfolio(id, items) {
    await sbDelete("portfolio_items", [q.eq("professional_id", id)]);
    const hasCover = items.some((it) => it.cover);
    const rows = items.map((it, i) => ({
      id: `up-${randomUUID()}`,
      professional_id: id,
      label: `IMG_${1000 + i}.JPG`,
      aspect: "square",
      focus: it.focus || "50% 50%",
      cover: it.cover || (!hasCover && i === 0),
      url: it.url,
      position: i,
    }));
    if (rows.length > 0) await sbInsert("portfolio_items", rows);
    return this.getById(id);
  },

  async listByStatus(status) {
    // !inner filtra os profissionais pelo status da identidade (join interno).
    const rows = await sbSelect<ProRow>("professionals", [
      q.select("*,portfolio_items(*),professional_identities!inner(*)"),
      { key: "professional_identities.status", value: `eq.${status}` },
      q.order("created_at.asc"),
    ]);
    return rows.map(toProfessional);
  },

  async setVerificationStatus(id, status) {
    await sbUpdate("professional_identities", [q.eq("professional_id", id)], { status });
    return this.getById(id);
  },

  async remove(id) {
    // FK on delete cascade remove identidade e portfólio junto.
    await sbDelete("professionals", [q.eq("id", id)]);
  },

  async registerNoShow(id) {
    const pro = await this.getById(id);
    if (!pro) return null;
    await sbUpdate("professionals", [q.eq("id", id)], { no_show_count: pro.noShowCount + 1 });
    return this.getById(id);
  },
};

export const supabaseClientRepository: ClientRepository = {
  async getById(id: string) {
    const rows = await sbSelect<ClientRow>("clients", [CLIENT_SELECT, q.eq("id", id), q.limit(1)]);
    return rows[0] ? toClient(rows[0]) : null;
  },

  async create(input: ClientInput) {
    const id = await uniqueSlug(input.name, "clients");
    await sbInsert("clients", {
      id,
      name: input.name,
      city: input.city,
      whatsapp: input.whatsapp,
      email: input.email,
      profile_photo_url: input.profilePhotoUrl,
    });
    try {
      await sbInsert("client_identities", identityInsert("client_id", id, input));
    } catch (err) {
      await sbDelete("clients", [q.eq("id", id)]).catch(() => {});
      throw err;
    }
    const created = await this.getById(id);
    if (!created) throw new Error("Falha ao criar o cliente.");
    return created;
  },

  async list() {
    const rows = await sbSelect<ClientRow>("clients", [CLIENT_SELECT, q.order("name.asc")]);
    return rows.map(toClient);
  },

  async listByStatus(status) {
    const rows = await sbSelect<ClientRow>("clients", [
      q.select("*,client_identities!inner(*)"),
      { key: "client_identities.status", value: `eq.${status}` },
      q.order("created_at.asc"),
    ]);
    return rows.map(toClient);
  },

  async update(id, patch) {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.city !== undefined) row.city = patch.city;
    if (patch.profilePhotoUrl !== undefined) row.profile_photo_url = patch.profilePhotoUrl;
    if (Object.keys(row).length > 0) await sbUpdate("clients", [q.eq("id", id)], row);
    return this.getById(id);
  },

  async setVerificationStatus(id, status) {
    await sbUpdate("client_identities", [q.eq("client_id", id)], { status });
    return this.getById(id);
  },

  async remove(id) {
    await sbDelete("clients", [q.eq("id", id)]);
  },
};

export const supabaseAccountRepository: AccountRepository = {
  async getById(id: string) {
    const rows = await sbSelect<AccountRow>("accounts", [q.select("*"), q.eq("id", id), q.limit(1)]);
    return rows[0] ? toAccount(rows[0]) : null;
  },

  async getByEmail(email: string) {
    const e = email.trim().toLowerCase();
    const rows = await sbSelect<AccountRow>("accounts", [q.select("*"), q.eq("email", e), q.limit(1)]);
    return rows[0] ? toAccount(rows[0]) : null;
  },

  async create(input) {
    const rows = await sbInsert<AccountRow>("accounts", {
      role: input.role,
      email: input.email.trim().toLowerCase(),
      password_hash: input.passwordHash,
      professional_id: input.professionalId ?? null,
      client_id: input.clientId ?? null,
    });
    return toAccount(rows[0]);
  },

  async updateEmail(id: string, email: string) {
    const rows = await sbUpdate<AccountRow>("accounts", [q.eq("id", id)], {
      email: email.trim().toLowerCase(),
    });
    return rows[0] ? toAccount(rows[0]) : null;
  },

  async updatePassword(id: string, passwordHash: string) {
    const rows = await sbUpdate<AccountRow>("accounts", [q.eq("id", id)], { password_hash: passwordHash });
    return rows[0] ? toAccount(rows[0]) : null;
  },

  async deleteByProfessionalId(professionalId: string) {
    await sbDelete("accounts", [q.eq("professional_id", professionalId)]);
  },

  async deleteByClientId(clientId: string) {
    await sbDelete("accounts", [q.eq("client_id", clientId)]);
  },
};

async function insertSystemMessage(conversationId: string, text: string): Promise<void> {
  await sbInsert("messages", {
    conversation_id: conversationId,
    sender: "sistema",
    text,
    filtered: false,
  });
}

async function fetchConversation(id: string): Promise<Conversation | null> {
  const rows = await sbSelect<ConversationRow>("conversations", [CONV_SELECT, q.eq("id", id), q.limit(1)]);
  return rows[0] ? toConversation(rows[0]) : null;
}

const brl = (n: number) => n.toLocaleString("pt-BR");

export const supabaseConversationRepository: ConversationRepository = {
  async create(input) {
    const rows = await sbInsert<ConversationRow>("conversations", {
      professional_id: input.professionalId,
      client_id: input.clientId,
      client_name: input.clientName,
      client_whatsapp: input.clientWhatsapp,
      event_type: input.eventType,
      event_date: input.eventDate,
      event_location: input.eventLocation,
      status: "conversando",
      proposal_amount: null,
      proposal_proposed_at: null,
      proposal_accepted_at: null,
      agreed_price: null,
      commission_rate: COMMISSION_RATE,
      confirmation_code: null,
    });
    const id = rows[0].id;
    await sbInsert("messages", {
      conversation_id: id,
      sender: input.firstMessage.sender,
      text: input.firstMessage.text,
      filtered: input.firstMessage.filtered,
    });
    const created = await fetchConversation(id);
    if (!created) throw new Error("Falha ao criar a conversa.");
    return created;
  },

  async getById(id: string) {
    return fetchConversation(id);
  },

  async addMessage(conversationId: string, message: ChatMessage) {
    const exists = await fetchConversation(conversationId);
    if (!exists) return null;
    await sbInsert("messages", {
      conversation_id: conversationId,
      sender: message.sender,
      text: message.text,
      filtered: message.filtered,
    });
    return fetchConversation(conversationId);
  },

  async sendProposal(conversationId: string, amount: number) {
    const conv = await fetchConversation(conversationId);
    if (!conv) return null;
    // Proposta só pode ser enviada/substituída antes do aceite.
    if (conv.status !== "conversando" && conv.status !== "proposta_enviada") return conv;
    await sbUpdate("conversations", [q.eq("id", conversationId)], {
      proposal_amount: amount,
      proposal_proposed_at: now(),
      proposal_accepted_at: null,
      status: "proposta_enviada",
    });
    await insertSystemMessage(conversationId, `Proposta enviada: R$ ${brl(amount)}`);
    return fetchConversation(conversationId);
  },

  async acceptProposal(conversationId: string) {
    const conv = await fetchConversation(conversationId);
    if (!conv) return null;
    // Aceite exige uma proposta enviada e ainda não aceita.
    if (conv.status !== "proposta_enviada" || !conv.proposal) return conv;
    await sbUpdate("conversations", [q.eq("id", conversationId)], {
      proposal_accepted_at: now(),
      status: "proposta_aceita",
    });
    await insertSystemMessage(
      conversationId,
      `Proposta de R$ ${brl(conv.proposal.amount)} aceita pelo cliente — pagamento liberado`
    );
    return fetchConversation(conversationId);
  },

  async setPaymentConfirmed(conversationId: string) {
    const conv = await fetchConversation(conversationId);
    if (!conv) return null;
    // Pagamento SÓ existe sobre proposta aceita registrada — nunca por valor solto.
    if (conv.status !== "proposta_aceita" || !conv.proposal?.acceptedAt) return conv;
    await sbUpdate("conversations", [q.eq("id", conversationId)], {
      status: "pagamento_confirmado",
      agreed_price: conv.proposal.amount,
    });
    await insertSystemMessage(conversationId, `Pagamento de R$ ${brl(conv.proposal.amount)} confirmado`);
    return fetchConversation(conversationId);
  },

  async releaseContact(conversationId: string) {
    const conv = await fetchConversation(conversationId);
    if (!conv) return null;
    // Contato só é liberado depois do pagamento — nunca antes.
    if (conv.status !== "pagamento_confirmado" && conv.status !== "contato_liberado") return conv;
    if (conv.status === "pagamento_confirmado") {
      await sbUpdate("conversations", [q.eq("id", conversationId)], {
        status: "contato_liberado",
        confirmation_code: String(randomInt(1000, 10000)),
      });
      await insertSystemMessage(
        conversationId,
        "Pagamento em custódia. Contato liberado — combinem o evento. No dia, o cliente passa o código de confirmação ao profissional."
      );
    }
    return fetchConversation(conversationId);
  },

  async confirmCompletion(conversationId: string, code: string) {
    const conv = await fetchConversation(conversationId);
    if (!conv) return null;
    if (conv.status !== "contato_liberado") return conv;
    if (!conv.confirmationCode || code.trim() !== conv.confirmationCode) return conv;
    await sbUpdate("conversations", [q.eq("id", conversationId)], { status: "concluido" });
    await insertSystemMessage(
      conversationId,
      "Código validado no evento — serviço concluído e pagamento liberado ao profissional."
    );
    return fetchConversation(conversationId);
  },

  async reportNoShow(conversationId: string) {
    const conv = await fetchConversation(conversationId);
    if (!conv) return null;
    if (conv.status !== "contato_liberado") return conv;
    await sbUpdate("conversations", [q.eq("id", conversationId)], { status: "em_disputa" });
    await insertSystemMessage(conversationId, "Cliente reportou não comparecimento. Em análise pela Clique.");
    return fetchConversation(conversationId);
  },

  async resolveDispute(conversationId: string, outcome: "reembolsar" | "liberar") {
    const conv = await fetchConversation(conversationId);
    if (!conv) return null;
    if (conv.status !== "em_disputa") return conv;
    if (outcome === "reembolsar") {
      await sbUpdate("conversations", [q.eq("id", conversationId)], { status: "reembolsado" });
      await insertSystemMessage(conversationId, "Disputa resolvida: valor reembolsado ao cliente.");
    } else {
      await sbUpdate("conversations", [q.eq("id", conversationId)], { status: "concluido" });
      await insertSystemMessage(conversationId, "Disputa resolvida: pagamento liberado ao profissional.");
    }
    return fetchConversation(conversationId);
  },

  async listForClient(clientId: string) {
    const rows = await sbSelect<ConversationRow>("conversations", [
      CONV_SELECT,
      q.eq("client_id", clientId),
      q.order("created_at.desc"),
    ]);
    return rows.map(toConversation);
  },

  async listForProfessional(professionalId: string) {
    const rows = await sbSelect<ConversationRow>("conversations", [
      CONV_SELECT,
      q.eq("professional_id", professionalId),
      q.order("created_at.desc"),
    ]);
    return rows.map(toConversation);
  },

  async listDisputes() {
    const rows = await sbSelect<ConversationRow>("conversations", [
      CONV_SELECT,
      q.eq("status", "em_disputa"),
      q.order("created_at.asc"),
    ]);
    return rows.map(toConversation);
  },

  async listPendingPayouts() {
    const rows = await sbSelect<ConversationRow>("conversations", [
      CONV_SELECT,
      q.eq("status", "concluido"),
      { key: "paid_out_at", value: "is.null" },
      q.order("created_at.asc"),
    ]);
    return rows.map(toConversation);
  },

  async markPaidOut(conversationId: string) {
    const conv = await fetchConversation(conversationId);
    if (!conv) return null;
    if (conv.status !== "concluido" || conv.paidOutAt) return conv;
    await sbUpdate("conversations", [q.eq("id", conversationId)], {
      paid_out_at: new Date().toISOString(),
    });
    await insertSystemMessage(conversationId, "Repasse ao profissional realizado pela Clique.");
    return fetchConversation(conversationId);
  },
};
