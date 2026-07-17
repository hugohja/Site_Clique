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

/** Tile do portfólio. Nesta fase são placeholders estilizados; na fase 2 viram URLs de upload. */
export interface PortfolioItem {
  id: string;
  /** Nome de arquivo exibido no tile, estilo dado de câmera (ex: IMG_4021.RAW). */
  label: string;
  /** Variação de tom do placeholder (0–5), mapeada em CSS. */
  tone: number;
  aspect: "wide" | "tall" | "square";
}

export interface Professional {
  id: string;
  name: string;
  city: City;
  type: ProfessionalType;
  specialties: EventType[];
  /** Preço "a partir de", em reais. Base para o cálculo de comissão na fase de pagamento. */
  priceFrom: number;
  /** Somente dígitos, com DDI (ex: 5521999998888). */
  whatsapp: string;
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
  "name" | "city" | "type" | "specialties" | "priceFrom" | "whatsapp" | "bio"
>;

/**
 * Versão pública do perfil: NUNCA carrega contato. É o único shape que as
 * APIs públicas e a UI de busca/perfil podem expor — o WhatsApp só sai do
 * servidor dentro de uma conversa com status "contato_liberado".
 */
export type PublicProfessional = Omit<Professional, "whatsapp">;

export function toPublicProfessional(pro: Professional): PublicProfessional {
  const { whatsapp: _hidden, ...publicPro } = pro;
  return publicPro;
}

/** Comissão da plataforma vigente (12%), gravada na conversa no fechamento. */
export const COMMISSION_RATE = 0.12;

/**
 * Fluxo anti-desintermediação:
 *  conversando          → chat aberto, contato oculto dos dois lados
 *  pagamento_confirmado → pagamento entrou (nesta fase, simulado; na fase 3,
 *                         webhook do gateway PIX/cartão)
 *  contato_liberado     → WhatsApp do profissional visível pros dois lados
 */
export type ConversationStatus = "conversando" | "pagamento_confirmado" | "contato_liberado";

export interface ChatMessage {
  id: string;
  sender: "cliente" | "profissional";
  text: string;
  /** true se o filtro anti-contato censurou trechos da mensagem. */
  filtered: boolean;
  createdAt: string;
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
  /** Valor fechado entre as partes, em reais. Base do split da fase 3. */
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
