import { PROFESSIONAL_TYPES, type ProfessionalType } from "@/lib/types";

export function typeLabel(type: ProfessionalType): string {
  return PROFESSIONAL_TYPES.find((t) => t.value === type)?.label ?? type;
}

/** Máscara de telefone BR: (99) 99999-9999 (celular) ou (99) 9999-9999 (fixo). */
export function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
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

/** Valor em reais no formato brasileiro com centavos: R$ 2.000,00. */
export function formatBRL(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Máscara de moeda para input: recebe o texto digitado, mantém só dígitos
 * (tratados como centavos) e devolve o valor em reais + o texto formatado.
 * Ex.: "200000" → { reais: 2000, display: "R$ 2.000,00" }.
 */
export function maskCurrency(raw: string): { reais: number; display: string } {
  const digits = raw.replace(/\D/g, "").slice(0, 11); // teto ~R$ 999 milhões
  const cents = digits ? parseInt(digits, 10) : 0;
  const reais = cents / 100;
  return { reais, display: formatBRL(reais) };
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
