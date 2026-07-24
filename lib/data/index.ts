import { isSupabaseConfigured } from "@/lib/supabase";
import type {
  AccountRepository,
  ApplicationRepository,
  ClientRepository,
  ConversationRepository,
  OpportunityRepository,
  ProfessionalRepository,
  ReviewRepository,
} from "./repository";
import {
  memoryAccountRepository,
  memoryApplicationRepository,
  memoryClientRepository,
  memoryConversationRepository,
  memoryOpportunityRepository,
  memoryRepository,
  memoryReviewRepository,
} from "./memory";
import {
  supabaseAccountRepository,
  supabaseApplicationRepository,
  supabaseClientRepository,
  supabaseConversationRepository,
  supabaseOpportunityRepository,
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
export const opportunityRepository: OpportunityRepository = useSupabase
  ? supabaseOpportunityRepository
  : memoryOpportunityRepository;
export const applicationRepository: ApplicationRepository = useSupabase
  ? supabaseApplicationRepository
  : memoryApplicationRepository;

export type {
  AccountRepository,
  ApplicationRepository,
  ClientRepository,
  ConversationRepository,
  OpportunityRepository,
  ProfessionalFilters,
  ProfessionalRepository,
  ReviewRepository,
} from "./repository";
