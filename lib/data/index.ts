import type { ConversationRepository, ProfessionalRepository } from "./repository";
import { memoryConversationRepository, memoryRepository } from "./memory";

/**
 * Ponto único de troca da camada de dados.
 * Fase 2: importar aqui as implementações Supabase/Postgres no lugar da memória.
 */
export const repository: ProfessionalRepository = memoryRepository;
export const conversationRepository: ConversationRepository = memoryConversationRepository;

export type {
  ConversationRepository,
  ProfessionalFilters,
  ProfessionalRepository,
} from "./repository";
