import { NextResponse } from "next/server";
import { accountRepository } from "@/lib/data";
import { currentAccount } from "@/lib/auth";
import { buildOpportunityView } from "@/lib/opportunityView";

/**
 * Detalhe de uma vaga. O dono (cliente que publicou) vê todas as candidaturas
 * com o mini-perfil de cada profissional; o profissional vê a vaga e a própria
 * candidatura; qualquer outro vê só a vaga.
 *
 * A página server-renderiza este mesmo dado (via buildOpportunityView), então
 * esta rota fica como API pública/compatibilidade.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await currentAccount((aid) => accountRepository.getById(aid));
  const view = await buildOpportunityView(id, account);
  if (!view) {
    return NextResponse.json({ error: "Vaga não encontrada." }, { status: 404 });
  }
  return NextResponse.json(view);
}
