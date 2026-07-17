import type { Professional, ProfessionalType } from "@/lib/types";

export function typeLabel(type: ProfessionalType): string {
  return type === "fotografo" ? "Fotógrafo" : "Filmmaker";
}

export function formatPrice(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR")}+`;
}

export function formatRating(pro: Professional): string {
  return pro.reviewCount > 0 ? `★ ${pro.rating.toFixed(1)}` : "★ novo";
}

export function formatResponse(pro: Professional): string {
  return pro.responseTimeHours !== null ? `resp. ${pro.responseTimeHours}h` : "resp. —";
}

/** Linha de dados no estilo EXIF: "R$ 800+ · ★ 4.9 · resp. 2h" */
export function formatExif(pro: Professional): string {
  return [formatPrice(pro.priceFrom), formatRating(pro), formatResponse(pro)].join(" · ");
}

export function whatsappUrl(pro: Professional): string {
  const message = `Olá, ${pro.name}! Vi seu perfil no Clica e queria um orçamento para cobertura de evento.`;
  return `https://wa.me/${pro.whatsapp}?text=${encodeURIComponent(message)}`;
}
