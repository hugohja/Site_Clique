/**
 * Tipos centrais do Clica.
 *
 * A estrutura já prevê as fases futuras (persistência real e pagamento com
 * split), mas nesta fase só Professional é usado de fato pela UI.
 */

export type ProfessionalType = "fotografo" | "filmmaker";

export const PROFESSIONAL_TYPES: { value: ProfessionalType; label: string }[] = [
  { value: "fotografo", label: "Fotógrafo" },
  { value: "filmmaker", label: "Filmmaker" },
];

export const CITIES = ["Rio de Janeiro", "Niterói", "Goiânia", "Anápolis"] as const;
export type City = (typeof CITIES)[number];

export const EVENT_TYPES = [
  "Casamento",
  "Aniversário",
  "Corporativo",
  "Ensaio",
  "Infantil",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Tile do portfólio. Com `url` presente é uma foto enviada no cadastro; sem, um placeholder estilizado. */
export interface PortfolioItem {
  id: string;
  /** Nome de arquivo exibido no tile, estilo dado de câmera (ex: IMG_4021.RAW). */
  label: string;
  /** Variação de tom do placeholder (0–5), mapeada em CSS. */
  tone: number;
  aspect: "wide" | "tall" | "square";
  /** Data URL da imagem enviada (fase atual); na fase 2 vira URL de storage. */
  url?: string | null;
}

export const GENDERS = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "nao_informar", label: "Prefiro não informar" },
] as const;
export type Gender = (typeof GENDERS)[number]["value"];

export interface Professional {
  id: string;
  name: string;
  city: City;
  type: ProfessionalType;
  specialties: EventType[];
  /** Preço "a partir de", em reais. Base para o cálculo de comissão na fase de pagamento. */
  priceFrom: number;
  /** Somente dígitos, com DDI (ex: 5521999998888). PRIVADO — nunca sai em resposta pública. */
  whatsapp: string;
  /**
   * CPF somente dígitos. PRIVADO — fica no banco pra identificação e futura
   * questão fiscal/contratual; nunca aparece em tela ou resposta pública.
   * (Validação real de dígito verificador fica pra fase 2.)
   */
  cpf: string | null;
  /** PRIVADO nesta fase — coletado no cadastro, não exibido publicamente. */
  gender: Gender | null;
  /** Data URL da foto de perfil (fase atual); na fase 2 vira URL de storage. Pública. */
  profilePhotoUrl: string | null;
  bio: string;
  /** Média 0–5. Perfis novos começam sem nota (reviewCount 0). */
  rating: number;
  reviewCount: number;
  /** Tempo médio de resposta em horas. null = sem histórico ainda. */
  responseTimeHours: number | null;
  portfolio: PortfolioItem[];
  createdAt: string;
}

/** Dados do formulário de cadastro (o resto é gerado pelo repositório). */
export type ProfessionalInput = Pick<
  Professional,
  | "name"
  | "city"
  | "type"
  | "specialties"
  | "priceFrom"
  | "whatsapp"
  | "cpf"
  | "gender"
  | "profilePhotoUrl"
  | "bio"
> & {
  /** Fotos de portfólio enviadas no cadastro (data URLs); vazio usa placeholders. */
  portfolioUrls?: string[];
};

/**
 * Versão pública do perfil: NUNCA carrega contato nem dados sensíveis
 * (WhatsApp, CPF, gênero). É o único shape que as APIs públicas e a UI de
 * busca/perfil podem expor — o WhatsApp só sai do servidor dentro de uma
 * conversa com status "contato_liberado"; o CPF não sai nunca.
 */
export type PublicProfessional = Omit<Professional, "whatsapp" | "cpf" | "gender">;

export function toPublicProfessional(pro: Professional): PublicProfessional {
  const { whatsapp: _w, cpf: _c, gender: _g, ...publicPro } = pro;
  return publicPro;
}

/** Comissão da plataforma vigente (12%), gravada na conversa no fechamento. */
export const COMMISSION_RATE = 0.12;

/**
 * Fluxo anti-desintermediação — o negócio inteiro fecha dentro da plataforma:
 *  conversando          → chat aberto, contato oculto dos dois lados
 *  proposta_enviada     → profissional propôs um valor em campo estruturado
 *  proposta_aceita      → cliente aceitou DENTRO da plataforma; só agora o
 *                         pagamento fica disponível
 *  pagamento_confirmado → pagamento entrou (nesta fase, simulado; na fase 3,
 *                         webhook do gateway PIX/cartão) — sempre pelo valor
 *                         da proposta aceita registrada, nunca por input livre
 *  contato_liberado     → WhatsApp do profissional visível pros dois lados
 *
 * Não existe estado em que o contato aparece antes do pagamento confirmado,
 * nem pagamento sem proposta aceita registrada.
 */
export type ConversationStatus =
  | "conversando"
  | "proposta_enviada"
  | "proposta_aceita"
  | "pagamento_confirmado"
  | "contato_liberado";

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
  /** Valor proposto pelo profissional, em reais. */
  amount: number;
  proposedAt: string;
  /** Preenchido quando o cliente aceita dentro da plataforma. */
  acceptedAt: string | null;
}

export interface Conversation {
  id: string;
  professionalId: string;
  clientName: string;
  /** Logística do evento — mostrada junto com o contato após a liberação. */
  eventType: EventType;
  eventDate: string;
  eventLocation: string;
  status: ConversationStatus;
  /** Proposta vigente (a última enviada). null enquanto status = conversando. */
  proposal: Proposal | null;
  /** Valor fechado, copiado da proposta aceita no pagamento. Base do split da fase 3. */
  agreedPrice: number | null;
  /** Percentual de comissão vigente no fechamento (ex: 0.12 = 12%). */
  commissionRate: number;
  messages: ChatMessage[];
  createdAt: string;
}

export type ConversationInput = Pick<
  Conversation,
  "professionalId" | "clientName" | "eventType" | "eventDate" | "eventLocation"
>;
