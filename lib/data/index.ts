import type {
  AccountRepository,
  ClientRepository,
  ConversationRepository,
  ProfessionalRepository,
} from "./repository";
import {
  memoryAccountRepository,
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
export const accountRepository: AccountRepository = memoryAccountRepository;

export type {
  AccountRepository,
  ClientRepository,
  ConversationRepository,
  ProfessionalFilters,
  ProfessionalRepository,
} from "./repository";
