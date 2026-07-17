import type { EventType, Professional, ProfessionalInput, ProfessionalType } from "@/lib/types";

export interface ProfessionalFilters {
  city?: string;
  eventType?: EventType | string;
  type?: ProfessionalType | string;
}

/**
 * Contrato da camada de dados. A UI e as API routes só conhecem esta
 * interface — na fase 2, basta criar uma implementação Supabase/Postgres
 * e trocá-la em lib/data/index.ts. Nada mais muda.
 */
export interface ProfessionalRepository {
  list(filters?: ProfessionalFilters): Promise<Professional[]>;
  getById(id: string): Promise<Professional | null>;
  create(input: ProfessionalInput): Promise<Professional>;
}
