/**
 * Tipos centrais do Clique.
 *
 * A estrutura já prevê as fases futuras (persistência real e pagamento com
 * split). Dados sensíveis (contato, CPF, documento) nunca saem em resposta
 * pública — ver PublicProfessional / PublicClient.
 */

export type ProfessionalType = "fotografo" | "filmmaker" | "editor";

export const PROFESSIONAL_TYPES: { value: ProfessionalType; label: string }[] = [
  { value: "fotografo", label: "Fotógrafo" },
  { value: "filmmaker", label: "Filmmaker" },
  { value: "editor", label: "Editor" },
];

/**
 * Cidade no formato "Nome – UF" (ex: "Rio de Janeiro – RJ"). A lista completa
 * dos municípios do Brasil (IBGE) vive em /public/cidades.json e é consumida
 * pelo autocomplete/geolocalização no cliente. O servidor só valida o formato.
 */
export type City = string;

/** Valida o formato "Nome – UF" (com o traço do autocomplete). */
export function isValidCity(value: string): boolean {
  return / – [A-Z]{2}$/.test(value.trim()) && value.trim().length >= 5;
}

/** Sugestões de evento/especialidade. A pessoa pode escrever outras (campo livre). */
export const EVENT_TYPES = [
  "Casamento",
  "Aniversário",
  "Corporativo",
  "Ensaio",
  "Infantil",
] as const;
/** Aceita as sugestões acima ou qualquer texto informado pela pessoa. */
export type EventType = string;

export const MAX_SPECIALTIES = 12;

/**
 * Palavras reservadas que NÃO são evento/especialidade (papéis do sistema).
 * Nunca entram como especialidade nem aparecem no filtro de eventos.
 */
const RESERVED_LABELS = new Set(["admin", "adm", "administrador", "administrator", "sistema"]);

/** true se o texto é uma palavra reservada (comparação sem acento/caixa). */
export function isReservedLabel(value: string): boolean {
  return RESERVED_LABELS.has(value.trim().toLowerCase());
}

/**
 * Normaliza uma especialidade/evento digitado (trim + limite de tamanho).
 * Palavras reservadas (ex.: "admin") viram string vazia e são descartadas.
 */
export function cleanEventLabel(value: string): string {
  const cleaned = value.trim().replace(/\s+/g, " ").slice(0, 40);
  return isReservedLabel(cleaned) ? "" : cleaned;
}

/**
 * Tile do portfólio. Todas as fotos aparecem no mesmo tamanho (quadrado); o
 * profissional escolhe o enquadramento (focus = object-position "x% y%"), a
 * ordem e a capa. `aspect` é legado (mantido por compatibilidade).
 */
export interface PortfolioItem {
  id: string;
  /** Nome de arquivo exibido no tile, estilo dado de câmera (ex: IMG_4021.RAW). */
  label: string;
  /** Legado: formato antigo. Hoje a grade é uniforme. */
  aspect: "wide" | "tall" | "square";
  /** Enquadramento: object-position (ex: "50% 30%"). Escolhido na hora de subir. */
  focus: string;
  /** true = foto principal (capa), exibida em destaque. No máximo uma. */
  cover: boolean;
  /** Data URL da imagem enviada (fase atual); na fase 2 vira URL de storage. */
  url: string;
}

/** Uma foto do portfólio como chega do formulário (antes de virar PortfolioItem). */
export interface PortfolioPhotoInput {
  url: string;
  aspect: "wide" | "tall" | "square";
  focus: string;
  cover: boolean;
}

/** Conta de acesso (login). Uma conta é OU profissional OU cliente. */
export interface Account {
  id: string;
  role: "profissional" | "cliente";
  /** E-mail de login, único entre todas as contas. */
  email: string;
  /** Hash scrypt "salt:derivada" — a senha em claro nunca é guardada. */
  passwordHash: string;
  professionalId: string | null;
  clientId: string | null;
  createdAt: string;
}

/** Conta sem o hash de senha — o que pode circular. */
export type PublicAccount = Omit<Account, "passwordHash">;

export const GENDERS = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "nao_informar", label: "Prefiro não informar" },
] as const;
export type Gender = (typeof GENDERS)[number]["value"];

export const DOCUMENT_TYPES = [
  { value: "rg", label: "RG" },
  { value: "cnh", label: "CNH" },
  { value: "passaporte", label: "Passaporte" },
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number]["value"];

/**
 * Nível de confirmação de identidade.
 *  em_analise → documento enviado, aguardando revisão manual
 *  verificado → identidade aprovada por um humano (fase 2: painel de moderação)
 * Nesta fase todo cadastro com documento entra como "em_analise".
 */
export type VerificationStatus = "em_analise" | "verificado";

/**
 * Dados sensíveis de identidade coletados no cadastro (profissional e cliente).
 * PRIVADO — nunca sai em resposta pública. Só a plataforma acessa pra
 * verificação, questão fiscal e contratual.
 */
export interface IdentityRecord {
  /** CPF somente dígitos. Sem validação de dígito verificador nesta fase. */
  cpf: string;
  /** Data URL do documento com foto (RG/CNH/passaporte). */
  documentType: DocumentType;
  documentPhotoUrl: string;
  gender: Gender | null;
  birthDate: string | null;
  status: VerificationStatus;
  submittedAt: string;
}

export interface Professional {
  id: string;
  name: string;
  city: City;
  type: ProfessionalType;
  specialties: EventType[];
  /** Somente dígitos, com DDI (ex: 5521999998888). PRIVADO — só sai no contato liberado. */
  whatsapp: string;
  /** E-mail de contato. PRIVADO. */
  email: string;
  /** Chave PIX para receber o repasse. PRIVADA — nunca aparece em tela/endpoint público. */
  payoutPixKey: string | null;
  /** Foto de perfil (data URL). Obrigatória no cadastro. Pública. */
  profilePhotoUrl: string;
  bio: string;
  /** Média 0–5. Perfis novos começam sem nota (reviewCount 0). */
  rating: number;
  reviewCount: number;
  /** Nº de não comparecimentos confirmados. Sinal de confiança público — sobe a cada disputa perdida. */
  noShowCount: number;
  /** Tempo médio de resposta em horas. null = sem histórico ainda. */
  responseTimeHours: number | null;
  /** Ao menos MIN_PORTFOLIO_PHOTOS fotos reais (obrigatório no cadastro). Público. */
  portfolio: PortfolioItem[];
  /**
   * Datas (YYYY-MM-DD) em que o profissional está indisponível/ocupado. Público
   * — o cliente vê pra não pedir uma data já tomada, e a criação de conversa
   * bloqueia essas datas.
   */
  unavailableDates: string[];
  /** Dados de identidade — PRIVADOS. */
  identity: IdentityRecord;
  createdAt: string;
}

/** Normaliza uma lista de datas de indisponibilidade: só YYYY-MM-DD futuras
 * (fuso BR), sem repetição, ordenadas. Máx. de um ano de datas. */
export function cleanUnavailableDates(dates: unknown, today: string): string[] {
  if (!Array.isArray(dates)) return [];
  const seen = new Set<string>();
  for (const d of dates) {
    const s = String(d).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s) && s >= today) seen.add(s);
  }
  return [...seen].sort().slice(0, 366);
}

/** Data de hoje (YYYY-MM-DD) no fuso de Brasília. */
export function todayInBrazil(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Cliente (quem contrata). Conta própria, verificada, reutilizada nas conversas. */
export interface Client {
  id: string;
  name: string;
  city: City | null;
  /** PRIVADO — só sai no contato liberado. */
  whatsapp: string;
  /** PRIVADO. */
  email: string;
  /** Foto de perfil (data URL). Obrigatória no cadastro. */
  profilePhotoUrl: string;
  /** Dados de identidade — PRIVADOS. */
  identity: IdentityRecord;
  createdAt: string;
}

export const MIN_PORTFOLIO_PHOTOS = 3;
export const MAX_PORTFOLIO_PHOTOS = 12;

/** Nível de confirmação de identidade legível. */
export function verificationLabel(status: VerificationStatus): string {
  return status === "verificado" ? "Identidade verificada" : "Identidade em análise";
}

/** Dados do formulário de cadastro de profissional. */
export interface ProfessionalInput {
  name: string;
  city: City;
  type: ProfessionalType;
  specialties: EventType[];
  whatsapp: string;
  email: string;
  bio: string;
  profilePhotoUrl: string;
  portfolio: PortfolioPhotoInput[];
  cpf: string;
  gender: Gender | null;
  birthDate: string | null;
  documentType: DocumentType;
  documentPhotoUrl: string;
}

/** Dados do formulário de cadastro de cliente. */
export interface ClientInput {
  name: string;
  city: City | null;
  whatsapp: string;
  email: string;
  profilePhotoUrl: string;
  cpf: string;
  gender: Gender | null;
  birthDate: string | null;
  documentType: DocumentType;
  documentPhotoUrl: string;
}

/**
 * Versão pública do profissional: NUNCA carrega contato nem identidade
 * (WhatsApp, e-mail, CPF, documento, gênero). Só sai o selo de verificação
 * (status). O WhatsApp só é revelado dentro de uma conversa "contato_liberado".
 */
export type PublicProfessional = Omit<
  Professional,
  "whatsapp" | "email" | "payoutPixKey" | "identity"
> & { verificationStatus: VerificationStatus };

export function toPublicProfessional(pro: Professional): PublicProfessional {
  // Remove TODOS os campos privados (contato + chave PIX de repasse) antes de expor.
  const { whatsapp: _w, email: _e, payoutPixKey: _p, identity, ...rest } = pro;
  return { ...rest, verificationStatus: identity.status };
}

/** Versão pública do cliente: só nome, cidade, foto e selo. Sem contato/identidade. */
export interface PublicClient {
  id: string;
  name: string;
  city: City | null;
  profilePhotoUrl: string;
  verificationStatus: VerificationStatus;
}

export function toPublicClient(client: Client): PublicClient {
  return {
    id: client.id,
    name: client.name,
    city: client.city,
    profilePhotoUrl: client.profilePhotoUrl,
    verificationStatus: client.identity.status,
  };
}

/**
 * Comissão da plataforma vigente (18%). É GRAVADA em cada conversa quando ela é
 * criada (commissionRate), então mudar esta taxa vale só pros negócios novos —
 * os que já estão em andamento mantêm a taxa com que foram criados.
 */
export const COMMISSION_RATE = 0.18;

/** Comissão da plataforma sobre um valor fechado (arredondada aos centavos). */
export function commissionAmount(price: number, rate: number): number {
  return Math.round(price * rate * 100) / 100;
}
/** Quanto o profissional recebe (valor menos a comissão, em centavos exatos). */
export function payoutAmount(price: number, rate: number): number {
  return Math.round((price - commissionAmount(price, rate)) * 100) / 100;
}

/**
 * Fluxo com custódia (escrow) — o negócio inteiro fecha dentro da plataforma:
 *  conversando          → chat aberto, contato oculto dos dois lados
 *  proposta_enviada     → profissional propôs um valor em campo estruturado
 *  proposta_aceita      → cliente aceitou DENTRO da plataforma; libera o pagamento
 *  pagamento_confirmado → pagamento entrou (simulado; na fase real, webhook do
 *                         gateway) — sempre pelo valor da proposta aceita
 *  contato_liberado     → dinheiro EM CUSTÓDIA na plataforma; contato dos dois
 *                         lados revelado pra combinarem o evento; um código de
 *                         confirmação é gerado (só o cliente vê)
 *  concluido            → o profissional digitou o código do cliente no evento →
 *                         pagamento liberado ao profissional (menos a comissão)
 *  em_disputa           → o cliente reportou não comparecimento; em análise
 *  reembolsado          → a Clique reembolsou o cliente; a nota do profissional cai
 *
 * O contato nunca aparece antes do pagamento; o dinheiro nunca vai ao
 * profissional sem o código (ou decisão do admin).
 */
export type ConversationStatus =
  | "conversando"
  | "proposta_enviada"
  | "proposta_aceita"
  | "pagamento_confirmado"
  | "contato_liberado"
  | "concluido"
  | "em_disputa"
  | "reembolsado"
  | "cancelado";

/** Estados em que o dinheiro já entrou (custódia ou depois) e o contato é revelado. */
export const PAID_STATUSES: ConversationStatus[] = [
  "contato_liberado",
  "concluido",
  "em_disputa",
  "reembolsado",
];

export interface ChatMessage {
  id: string;
  /** "sistema" registra eventos do negócio (proposta enviada/aceita, pagamento). */
  sender: "cliente" | "profissional" | "sistema";
  text: string;
  /** true se o filtro anti-contato censurou trechos da mensagem. */
  filtered: boolean;
  createdAt: string;
}

/** Proposta de valor estruturada — o único caminho pra fechar preço. */
export interface Proposal {
  /** Valor da proposta vigente, em reais. */
  amount: number;
  /**
   * Quem fez a proposta vigente. O profissional abre o orçamento; o cliente
   * pode responder com uma contraproposta, e assim vai até um dos dois aceitar.
   * O aceite é sempre do OUTRO lado (ninguém aceita a própria proposta).
   */
  by: "cliente" | "profissional";
  proposedAt: string;
  /** Preenchido quando o outro lado aceita dentro da plataforma. */
  acceptedAt: string | null;
}

export interface Conversation {
  id: string;
  professionalId: string;
  clientId: string;
  clientName: string;
  /** PRIVADO — revelado ao profissional só no contato liberado. */
  clientWhatsapp: string;
  /** Logística do evento — mostrada junto com o contato após a liberação. */
  eventType: EventType;
  eventDate: string;
  /** Horário do evento (HH:MM). */
  eventTime: string;
  eventLocation: string;
  status: ConversationStatus;
  /** Proposta vigente (a última enviada). null enquanto status = conversando. */
  proposal: Proposal | null;
  /** Valor fechado, copiado da proposta aceita no pagamento. Base do split da fase 3. */
  agreedPrice: number | null;
  /** Percentual de comissão vigente no fechamento (ex: 0.18 = 18%). */
  commissionRate: number;
  /**
   * Código de confirmação do evento (4 dígitos), gerado quando o dinheiro entra
   * em custódia. SÓ O CLIENTE vê; o profissional digita no evento pra concluir.
   */
  confirmationCode: string | null;
  /** Quando o admin marcou o repasse ao profissional como feito (custódia liberada). */
  paidOutAt: string | null;
  /** Última vez que cada lado abriu a conversa — base do "não lida". */
  clientLastReadAt: string | null;
  proLastReadAt: string | null;
  messages: ChatMessage[];
  createdAt: string;
}

/** Uma conversa tem mensagem não lida pro papel dado se a última mensagem é da
 * outra pessoa (ou do sistema) e chegou depois da última vez que ele abriu. */
export function hasUnread(conv: Conversation, role: "cliente" | "profissional"): boolean {
  const last = conv.messages[conv.messages.length - 1];
  if (!last || last.sender === role) return false;
  const lastRead = role === "cliente" ? conv.clientLastReadAt : conv.proLastReadAt;
  return !lastRead || last.createdAt > lastRead;
}

export type ConversationInput = Pick<
  Conversation,
  "professionalId" | "clientId" | "eventType" | "eventDate" | "eventTime" | "eventLocation"
>;

/** Avaliação do cliente após o serviço concluído. Uma por conversa. */
export interface Review {
  id: string;
  conversationId: string;
  professionalId: string;
  clientId: string;
  /** Nome do cliente no momento da avaliação (público no perfil). */
  clientName: string;
  /** 1 a 5 estrelas. */
  rating: number;
  comment: string;
  createdAt: string;
}

export type ReviewInput = Pick<
  Review,
  "conversationId" | "professionalId" | "clientId" | "clientName" | "rating" | "comment"
>;

/** Normaliza uma nota pro intervalo 1–5 (inteiro). */
export function cleanRating(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(5, Math.max(1, Math.round(n)));
}

/**
 * Oportunidade/Vaga: uma empresa (conta de cliente) anuncia um evento e os
 * profissionais se candidatam. Ao escolher um candidato, abre a conversa normal
 * com custódia — o fechamento continua dentro da Clique.
 */
export type OpportunityStatus = "aberta" | "encerrada";

export interface Opportunity {
  id: string;
  clientId: string;
  clientName: string;
  eventType: EventType;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  description: string;
  /** Quantas vagas (profissionais) o evento precisa. */
  slots: number;
  /** Faixa de cachê por vaga (opcional), em reais. */
  budgetMin: number | null;
  budgetMax: number | null;
  status: OpportunityStatus;
  createdAt: string;
}

export type OpportunityInput = Pick<
  Opportunity,
  | "clientId"
  | "clientName"
  | "eventType"
  | "eventDate"
  | "eventTime"
  | "eventLocation"
  | "description"
  | "slots"
  | "budgetMin"
  | "budgetMax"
>;

export type ApplicationStatus = "pendente" | "escolhida" | "recusada";

/** Candidatura de um profissional a uma oportunidade. Uma por (vaga, profissional). */
export interface Application {
  id: string;
  opportunityId: string;
  professionalId: string;
  professionalName: string;
  message: string;
  /** Valor que o profissional cobra (opcional); vira a proposta ao ser escolhido. */
  proposedAmount: number | null;
  status: ApplicationStatus;
  createdAt: string;
}

export type ApplicationInput = Pick<
  Application,
  "opportunityId" | "professionalId" | "professionalName" | "message" | "proposedAmount"
>;

/** Máximo de vagas por oportunidade (evita número absurdo). */
export const MAX_SLOTS = 20;

/** Normaliza o nº de vagas pro intervalo 1–MAX_SLOTS. */
export function cleanSlots(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_SLOTS, Math.max(1, Math.round(n)));
}

/** Antecedência mínima para eventos no mesmo dia (2 horas). */
export const MIN_EVENT_LEAD_HOURS = 2;

/**
 * Valida a data + hora do evento no fuso de Brasília (UTC-3, sem horário de
 * verão desde 2019). Retorna mensagem de erro, ou null se estiver ok.
 * Regras: nada no passado; se for hoje, pelo menos 2h de antecedência.
 */
export function eventDateTimeError(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Informe a data do evento.";
  if (!/^\d{2}:\d{2}$/.test(time)) return "Informe o horário do evento.";

  const now = Date.now();
  const eventMs = Date.parse(`${date}T${time}:00-03:00`);
  if (Number.isNaN(eventMs)) return "Data ou horário inválidos.";

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));

  if (date < today) return "A data do evento já passou — escolha uma data futura.";
  if (date === today && eventMs - now < MIN_EVENT_LEAD_HOURS * 3600_000) {
    return `Para hoje, escolha um horário com pelo menos ${MIN_EVENT_LEAD_HOURS} horas de antecedência.`;
  }
  // Teto leve só pra pegar erro grosseiro de digitação no ano (ex.: 2099).
  if (eventMs - now > 5 * 365 * 24 * 3600_000) return "Data muito distante — confira o ano.";
  return null;
}
