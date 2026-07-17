import type { ProfessionalRepository } from "./repository";
import { memoryRepository } from "./memory";

/**
 * Ponto único de troca da camada de dados.
 * Fase 2: importar aqui a implementação Supabase/Postgres no lugar da memória.
 */
export const repository: ProfessionalRepository = memoryRepository;

export type { ProfessionalFilters, ProfessionalRepository } from "./repository";
