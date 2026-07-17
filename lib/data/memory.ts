import type { PortfolioItem, Professional, ProfessionalInput } from "@/lib/types";
import { SEED_PROFESSIONALS } from "./seed";
import type { ProfessionalFilters, ProfessionalRepository } from "./repository";

/**
 * Implementação em memória do repositório (fase 1: sem banco).
 *
 * O estado vive em globalThis para sobreviver ao hot-reload em dev. Cadastros
 * feitos pelo formulário existem enquanto o processo do servidor viver — é o
 * comportamento esperado do protótipo; persistência real chega na fase 2.
 */

const g = globalThis as unknown as { __clicaStore?: Professional[] };

function store(): Professional[] {
  if (!g.__clicaStore) {
    g.__clicaStore = SEED_PROFESSIONALS.map((p) => ({ ...p }));
  }
  return g.__clicaStore;
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  let slug = base || "profissional";
  let n = 2;
  const all = store();
  while (all.some((p) => p.id === slug)) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

function placeholderPortfolio(): PortfolioItem[] {
  const aspects: PortfolioItem["aspect"][] = ["wide", "tall", "square"];
  const seed = store().length + 11;
  return Array.from({ length: 6 }, (_, i) => ({
    id: `p${seed}-${i}`,
    label: `IMG_${((seed * 977 + i * 341) % 9000) + 1000}.RAW`,
    tone: (seed + i) % 6,
    aspect: aspects[(seed + i * 2) % 3],
  }));
}

export const memoryRepository: ProfessionalRepository = {
  async list(filters: ProfessionalFilters = {}) {
    let result = store().slice();
    if (filters.city) {
      result = result.filter((p) => p.city === filters.city);
    }
    if (filters.type) {
      result = result.filter((p) => p.type === filters.type);
    }
    if (filters.eventType) {
      result = result.filter((p) => p.specialties.includes(filters.eventType as never));
    }
    // Ordena por nota (perfis novos, sem avaliação, vão pro fim).
    return result.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
  },

  async getById(id: string) {
    return store().find((p) => p.id === id) ?? null;
  },

  async create(input: ProfessionalInput) {
    const professional: Professional = {
      ...input,
      id: slugify(input.name),
      rating: 0,
      reviewCount: 0,
      responseTimeHours: null,
      portfolio: placeholderPortfolio(),
      createdAt: new Date().toISOString(),
    };
    store().push(professional);
    return professional;
  },
};
