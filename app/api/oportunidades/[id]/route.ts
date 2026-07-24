import { NextResponse } from "next/server";
import {
  accountRepository,
  applicationRepository,
  opportunityRepository,
  repository,
} from "@/lib/data";
import { currentAccount } from "@/lib/auth";

/**
 * Detalhe de uma vaga. O dono (cliente que publicou) vê todas as candidaturas
 * com o mini-perfil de cada profissional; o profissional vê a vaga e a própria
 * candidatura; qualquer outro vê só a vaga.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opp = await opportunityRepository.getById(id);
  if (!opp) {
    return NextResponse.json({ error: "Vaga não encontrada." }, { status: 404 });
  }

  const account = await currentAccount((aid) => accountRepository.getById(aid));
  const isOwner = account?.role === "cliente" && account.clientId === opp.clientId;
  const proId = account?.role === "profissional" ? account.professionalId : null;

  let viewerRole: "dono" | "profissional" | "outro" = "outro";
  if (isOwner) viewerRole = "dono";
  else if (proId) viewerRole = "profissional";

  let applications: unknown[] = [];
  let myApplication = null;

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
    myApplication = await applicationRepository.getByPro(id, proId);
  }

  return NextResponse.json({ opportunity: opp, viewerRole, applications, myApplication });
}
