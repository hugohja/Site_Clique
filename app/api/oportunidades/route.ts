import { NextRequest, NextResponse } from "next/server";
import { accountRepository, clientRepository, opportunityRepository } from "@/lib/data";
import { censorContactAttempts } from "@/lib/moderation";
import { cleanEventLabel, cleanSlots, eventDateTimeError } from "@/lib/types";
import { currentAccount } from "@/lib/auth";

/** Vagas abertas — qualquer um vê (profissionais se candidatam). */
export async function GET() {
  const opps = await opportunityRepository.listOpen();
  return NextResponse.json({ opportunities: opps });
}

/** Publica uma vaga de evento. Só conta de CLIENTE (empresa) pode publicar. */
export async function POST(request: NextRequest) {
  const account = await currentAccount((id) => accountRepository.getById(id));
  if (!account) {
    return NextResponse.json({ error: "Entre com sua conta para publicar uma vaga." }, { status: 401 });
  }
  if (account.role !== "cliente" || !account.clientId) {
    return NextResponse.json(
      { error: "Só contas de cliente/empresa publicam vagas. Contas profissionais se candidatam." },
      { status: 403 }
    );
  }
  const client = await clientRepository.getById(account.clientId);
  if (!client) {
    return NextResponse.json({ error: "Conta de cliente não encontrada." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const eventType = cleanEventLabel(String(body.eventType ?? ""));
  const eventDate = String(body.eventDate ?? "");
  const eventTime = String(body.eventTime ?? "");
  const eventLocation = String(body.eventLocation ?? "").trim();
  const rawDescription = String(body.description ?? "").trim();
  const slots = cleanSlots(Number(body.slots));
  const budgetMin = body.budgetMin != null && Number.isFinite(Number(body.budgetMin))
    ? Math.max(0, Math.round(Number(body.budgetMin)))
    : null;
  const budgetMax = body.budgetMax != null && Number.isFinite(Number(body.budgetMax))
    ? Math.max(0, Math.round(Number(body.budgetMax)))
    : null;

  const errors: string[] = [];
  if (eventType.length < 2) errors.push("Informe o tipo de evento.");
  const dateErr = eventDateTimeError(eventDate, eventTime);
  if (dateErr) errors.push(dateErr);
  if (eventLocation.length < 3) errors.push("Informe o local do evento.");
  if (rawDescription.length < 10) errors.push("Descreva a vaga (o que precisa, quantas pessoas, etc.).");
  if (budgetMin != null && budgetMax != null && budgetMax < budgetMin) {
    errors.push("A faixa de cachê está invertida (máximo menor que o mínimo).");
  }
  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  // Filtra tentativa de contato na descrição (mesma regra do chat).
  const description = censorContactAttempts(rawDescription).text;

  const opp = await opportunityRepository.create({
    clientId: client.id,
    clientName: client.name,
    eventType,
    eventDate,
    eventTime,
    eventLocation,
    description,
    slots,
    budgetMin,
    budgetMax,
  });
  return NextResponse.json({ id: opp.id }, { status: 201 });
}
