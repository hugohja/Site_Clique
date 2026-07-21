import { PROFESSIONAL_TYPES, type ProfessionalType } from "@/lib/types";

export function typeLabel(type: ProfessionalType): string {
  return PROFESSIONAL_TYPES.find((t) => t.value === type)?.label ?? type;
}

/** Máscara visual de CPF: 000.000.000-00 (sem validar dígito verificador). */
export function maskCpf(raw: string): string {
  return raw
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

// Aceitam qualquer objeto com esses campos (Professional ou PublicProfessional).
export function formatRating(pro: { rating: number; reviewCount: number }): string {
  return pro.reviewCount > 0 ? `★ ${pro.rating.toFixed(1)}` : "★ novo";
}

export function formatResponse(pro: { responseTimeHours: number | null }): string {
  return pro.responseTimeHours !== null ? `resp. ${pro.responseTimeHours}h` : "resp. —";
}

/** Linha de dados no estilo EXIF: "★ 4.9 · resp. 2h". Sem preço fixo — o valor
 * é definido por evento, via proposta no chat. */
export function formatExif(pro: {
  rating: number;
  reviewCount: number;
  responseTimeHours: number | null;
}): string {
  return [formatRating(pro), formatResponse(pro)].join(" · ");
}

// Nota anti-desintermediação: não existe helper de link de WhatsApp aqui de
// propósito. O contato só aparece no ChatView, vindo da API de conversa com
// status "contato_liberado".
