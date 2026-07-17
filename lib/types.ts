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
 * FASE 3 (não implementado): solicitação/fechamento entre cliente e profissional.
 * Definido desde já para o gateway de pagamento com split ser plugado sem
 * refatorar o modelo. Nenhuma UI usa isso ainda.
 */
export interface Booking {
  id: string;
  professionalId: string;
  clientName: string;
  eventType: EventType;
  eventDate: string;
  status: "aberta" | "fechada" | "cancelada";
  /** Valor fechado entre as partes, em reais. */
  agreedPrice: number | null;
  /** Percentual de comissão da plataforma vigente no fechamento (ex: 0.12 = 12%). */
  commissionRate: number;
  createdAt: string;
}
