import type { Professional } from "@/lib/types";

/**
 * A plataforma começa SEM profissionais — os perfis reais entram pelo cadastro
 * (/cadastro). Sem dados fictícios de demonstração.
 *
 * Na fase 2 este arquivo pode virar o script de seed do banco (ex: importar
 * uma leva inicial de profissionais reais já validados), mantendo o mesmo shape.
 */
export const SEED_PROFESSIONALS: Professional[] = [];
