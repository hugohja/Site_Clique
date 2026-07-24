import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  accountRepository,
  applicationRepository,
  clientRepository,
  conversationRepository,
  opportunityRepository,
  repository,
} from "@/lib/data";
import { currentAccount } from "@/lib/auth";

/**
 * A empresa (dono da vaga) ESCOLHE um candidato. Isso abre a conversa normal
 * com proposta + custódia — o fechamento continua dentro da Clique. Marca a
 * candidatura como escolhida e, se as vagas se esgotam, encerra a vaga.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await currentAccount((aid) => accountRepository.getById(aid));
  if (!account || account.role !== "cliente" || !account.clientId) {
    return NextResponse.json({ error: "Só o dono da vaga escolhe candidatos." }, { status: 403 });
  }

  const opp = await opportunityRepository.getById(id);
  if (!opp) return NextResponse.json({ error: "Vaga não encontrada." }, { status: 404 });
  if (opp.clientId !== account.clientId) {
    return NextResponse.json({ error: "Esta vaga é de outra conta." }, { status: 403 });
  }
  if (opp.status !== "aberta") {
    return NextResponse.json({ error: "Esta vaga já foi encerrada." }, { status: 409 });
  }

  let body: { applicationId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const applicationId = String(body.applicationId ?? "");

  const apps = await applicationRepository.listForOpportunity(id);
  const app = apps.find((a) => a.id === applicationId);
  if (!app) return NextResponse.json({ error: "Candidatura não encontrada." }, { status: 404 });
  if (app.status === "escolhida") {
    return NextResponse.json({ error: "Este candidato já foi escolhido." }, { status: 409 });
  }

  const [client, pro] = await Promise.all([
    clientRepository.getById(opp.clientId),
    repository.getById(app.professionalId),
  ]);
  if (!client || !pro) {
    return NextResponse.json({ error: "Cliente ou profissional não encontrado." }, { status: 404 });
  }

  // Abre a conversa (fluxo normal de custódia).
  const conversation = await conversationRepository.create({
    professionalId: pro.id,
    clientId: client.id,
    clientName: client.name,
    clientWhatsapp: client.whatsapp,
    eventType: opp.eventType,
    eventDate: opp.eventDate,
    eventTime: opp.eventTime,
    eventLocation: opp.eventLocation,
    firstMessage: {
      id: randomUUID(),
      sender: "cliente",
      text: `Você foi escolhido para a vaga "${opp.eventType}". Vamos combinar os detalhes por aqui.`,
      filtered: false,
      createdAt: new Date().toISOString(),
    },
  });

  // Se o profissional informou um valor na candidatura, já entra como proposta.
  if (app.proposedAmount && app.proposedAmount > 0) {
    await conversationRepository.sendProposal(conversation.id, app.proposedAmount, "profissional");
  }

  await applicationRepository.setStatus(app.id, "escolhida");

  // Encerra a vaga quando o nº de escolhidos atinge as vagas disponíveis.
  const chosen = apps.filter((a) => a.status === "escolhida").length + 1;
  if (chosen >= opp.slots) {
    await opportunityRepository.close(id);
  }

  return NextResponse.json({ conversationId: conversation.id });
}
