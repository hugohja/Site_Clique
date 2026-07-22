import { isSupabaseConfigured } from "@/lib/supabase";
import type {
  AccountRepository,
  ClientRepository,
  ConversationRepository,
  ProfessionalRepository,
  ReviewRepository,
} from "./repository";
import {
  memoryAccountRepository,
  memoryClientRepository,
  memoryConversationRepository,
  memoryRepository,
  memoryReviewRepository,
} from "./memory";
import {
  supabaseAccountRepository,
  supabaseClientRepository,
  supabaseConversationRepository,
  supabaseRepository,
  supabaseReviewRepository,
} from "./supabase";

/**
 * Ponto único de troca da camada de dados.
 *
 * Com SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY definidos, usa Postgres/Storage
 * (dados persistem). Sem eles, cai no store em memória — o protótipo e a demo
 * continuam funcionando sem configuração nenhuma.
 */
const useSupabase = isSupabaseConfigured();

export const repository: ProfessionalRepository = useSupabase
  ? supabaseRepository
  : memoryRepository;
export const clientRepository: ClientRepository = useSupabase
  ? supabaseClientRepository
  : memoryClientRepository;
export const conversationRepository: ConversationRepository = useSupabase
  ? supabaseConversationRepository
  : memoryConversationRepository;
export const accountRepository: AccountRepository = useSupabase
  ? supabaseAccountRepository
  : memoryAccountRepository;
export const reviewRepository: ReviewRepository = useSupabase
  ? supabaseReviewRepository
  : memoryReviewRepository;

export type {
  AccountRepository,
  ClientRepository,
  ConversationRepository,
  ProfessionalFilters,
  ProfessionalRepository,
  ReviewRepository,
} from "./repository";
