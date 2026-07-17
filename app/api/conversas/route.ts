import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { clientRepository, conversationRepository, repository } from "@/lib/data";
import { censorContactAttempts } from "@/lib/moderation";
import { EVENT_TYPES } from "@/lib/types";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const professionalId = String(body.professionalId ?? "");
  const clientId = String(body.clientId ?? "");
  const eventType = String(body.eventType ?? "");
  const eventDate = String(body.eventDate ?? "");
  const eventLocation = String(body.eventLocation ?? "").trim();
  const firstMessage = String(body.message ?? "").trim();

  const errors: string[] = [];
  if (!EVENT_TYPES.includes(eventType as never)) errors.push("Tipo de evento inválido.");
  if (!eventDate) errors.push("Informe a data do evento.");
  if (eventLocation.length < 3) errors.push("Informe o local do evento.");
  if (firstMessage.length < 5) errors.push("Escreva uma mensagem inicial.");

  const professional = await repository.getById(professionalId);
  if (!professional) errors.push("Profissional não encontrado.");

  // Cliente precisa estar cadastrado (conta verificada) pra iniciar conversa.
  const client = clientId ? await clientRepository.getById(clientId) : null;
  if (!client) errors.push("Faça seu cadastro de cliente antes de iniciar uma conversa.");

  if (errors.length > 0 || !client) {
    return NextResponse.json({ error: errors.join(" ") || "Cadastro de cliente necessário." }, { status: 400 });
  }

  const moderated = censorContactAttempts(firstMessage);
  const conversation = await conversationRepository.create({
    professionalId,
    clientId: client.id,
    // Snapshot do cliente: nome é público no chat; whatsapp fica guardado e só
    // é revelado ao profissional no contato liberado.
    clientName: client.name,
    clientWhatsapp: client.whatsapp,
    eventType: eventType as never,
    eventDate,
    eventLocation,
    firstMessage: {
      id: randomUUID(),
      sender: "cliente",
      text: moderated.text,
      filtered: moderated.filtered,
      createdAt: new Date().toISOString(),
    },
  });

  return NextResponse.json({ id: conversation.id }, { status: 201 });
}
