import type { Professional } from "@/lib/types";

/** Formas de ordenar a busca de profissionais. */
export type ProSort = "relevancia" | "avaliacao" | "recentes";

export const PRO_SORTS: { value: ProSort; label: string }[] = [
  { value: "relevancia", label: "Relevância" },
  { value: "avaliacao", label: "Melhor avaliados" },
  { value: "recentes", label: "Mais recentes" },
];

export function isProSort(v: unknown): v is ProSort {
  return v === "relevancia" || v === "avaliacao" || v === "recentes";
}

/** Profissional bem avaliado o bastante pra ganhar destaque no card. */
export function isTopRated(pro: { rating: number; reviewCount: number }): boolean {
  return pro.reviewCount >= 3 && pro.rating >= 4.5;
}

function verified(p: Professional): number {
  return p.identity.status === "verificado" ? 1 : 0;
}

function byRating(a: Professional, b: Professional): number {
  return b.rating - a.rating;
}

function byResponse(a: Professional, b: Professional): number {
  const av = a.responseTimeHours ?? Infinity;
  const bv = b.responseTimeHours ?? Infinity;
  return av - bv;
}

function byNewest(a: Professional, b: Professional): number {
  return b.createdAt.localeCompare(a.createdAt);
}

/**
 * Ordena a lista de profissionais conforme o modo escolhido. Não muta a entrada.
 *
 *  relevancia (padrão): verificados primeiro, depois melhor nota, mais
 *    avaliações, resposta mais rápida e, por fim, cadastro mais recente.
 *  avaliacao: melhor nota primeiro (desempate por nº de avaliações e recência).
 *  recentes: cadastro mais novo primeiro.
 */
export function rankProfessionals(pros: Professional[], sort: ProSort = "relevancia"): Professional[] {
  const arr = [...pros];
  if (sort === "recentes") {
    return arr.sort(byNewest);
  }
  if (sort === "avaliacao") {
    return arr.sort(
      (a, b) => byRating(a, b) || b.reviewCount - a.reviewCount || byNewest(a, b)
    );
  }
  return arr.sort(
    (a, b) =>
      verified(b) - verified(a) ||
      byRating(a, b) ||
      b.reviewCount - a.reviewCount ||
      byResponse(a, b) ||
      byNewest(a, b)
  );
}
