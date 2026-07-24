import { applicationRepository, opportunityRepository, repository } from "@/lib/data";
import type { Account, Opportunity, ProfessionalType } from "@/lib/types";

/** Mini-perfil do candidato que o dono da vaga vê ao lado da candidatura. */
export interface CandidatePro {
  city: string;
  type: ProfessionalType;
  rating: number;
  reviewCount: number;
  profilePhotoUrl: string;
  verified: boolean;
}

export interface CandidateApplication {
  id: string;
  professionalId: string;
  professionalName: string;
  message: string;
  proposedAmount: number | null;
  status: "pendente" | "escolhida" | "recusada";
  createdAt: string;
  pro: CandidatePro | null;
}

export interface MyApplicationView {
  id: string;
  message: string;
  proposedAmount: number | null;
  status: string;
}

export interface OpportunityView {
  opportunity: Opportunity;
  viewerRole: "dono" | "profissional" | "outro";
  applications: CandidateApplication[];
  myApplication: MyApplicationView | null;
}

/**
 * Monta a visão de uma vaga conforme quem está olhando. O dono (cliente que
 * publicou) vê todas as candidaturas com o mini-perfil de cada profissional;
 * o profissional vê a própria candidatura; qualquer outro vê só a vaga.
 *
 * Usado tanto pelo server component (renderiza direto, sem waterfall) quanto
 * pela API route. Retorna null quando a vaga não existe.
 */
export async function buildOpportunityView(
  id: string,
  account: Account | null
): Promise<OpportunityView | null> {
  const opp = await opportunityRepository.getById(id);
  if (!opp) return null;

  const isOwner = account?.role === "cliente" && account.clientId === opp.clientId;
  const proId = account?.role === "profissional" ? account.professionalId : null;

  let viewerRole: "dono" | "profissional" | "outro" = "outro";
  if (isOwner) viewerRole = "dono";
  else if (proId) viewerRole = "profissional";

  let applications: CandidateApplication[] = [];
  let myApplication: MyApplicationView | null = null;

  if (isOwner) {
    const apps = await applicationRepository.listForOpportunity(id);
    applications = await Promise.all(
      apps.map(async (a) => {
        const pro = await repository.getById(a.professionalId);
        return {
          id: a.id,
          professionalId: a.professionalId,
          professionalName: a.professionalName,
          message: a.message,
          proposedAmount: a.proposedAmount,
          status: a.status,
          createdAt: a.createdAt,
          pro: pro
            ? {
                city: pro.city,
                type: pro.type,
                rating: pro.rating,
                reviewCount: pro.reviewCount,
                profilePhotoUrl: pro.profilePhotoUrl,
                verified: pro.identity.status === "verificado",
              }
            : null,
        };
      })
    );
  } else if (proId) {
    const mine = await applicationRepository.getByPro(id, proId);
    if (mine) {
      myApplication = {
        id: mine.id,
        message: mine.message,
        proposedAmount: mine.proposedAmount,
        status: mine.status,
      };
    }
  }

  return { opportunity: opp, viewerRole, applications, myApplication };
}
