import type {
  ClientRepository,
  ConversationRepository,
  ProfessionalRepository,
} from "./repository";
import {
  memoryClientRepository,
  memoryConversationRepository,
  memoryRepository,
} from "./memory";

/**
 * Ponto único de troca da camada de dados.
 * Fase 2: importar aqui as implementações Supabase/Postgres no lugar da memória.
 */
export const repository: ProfessionalRepository = memoryRepository;
export const clientRepository: ClientRepository = memoryClientRepository;
export const conversationRepository: ConversationRepository = memoryConversationRepository;

export type {
  ClientRepository,
  ConversationRepository,
  ProfessionalFilters,
  ProfessionalRepository,
} from "./repository";
