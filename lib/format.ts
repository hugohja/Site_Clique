import type { ProfessionalType, PublicProfessional } from "@/lib/types";

export function typeLabel(type: ProfessionalType): string {
  return type === "fotografo" ? "Fotógrafo" : "Filmmaker";
}

export function formatPrice(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR")}+`;
}

export function formatRating(pro: PublicProfessional): string {
  return pro.reviewCount > 0 ? `★ ${pro.rating.toFixed(1)}` : "★ novo";
}

export function formatResponse(pro: PublicProfessional): string {
  return pro.responseTimeHours !== null ? `resp. ${pro.responseTimeHours}h` : "resp. —";
}

/** Linha de dados no estilo EXIF: "R$ 800+ · ★ 4.9 · resp. 2h" */
export function formatExif(pro: PublicProfessional): string {
  return [formatPrice(pro.priceFrom), formatRating(pro), formatResponse(pro)].join(" · ");
}

// Nota anti-desintermediação: não existe helper de link de WhatsApp aqui de
// propósito. O contato só aparece no ChatView, vindo da API de conversa com
// status "contato_liberado".
