import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { accountRepository, clientRepository, conversationRepository, repository } from "@/lib/data";
import { censorContactAttempts } from "@/lib/moderation";
import { cleanEventLabel, hasUnread, type Conversation } from "@/lib/types";
import { currentAccount } from "@/lib/auth";

/** Inbox: conversas do usuário logado (cliente ou profissional). */
export async function GET() {
  const account = await currentAccount((id) => accountRepository.getById(id));
  if (!account) {
    return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
  }
  let convs: Conversation[] = [];
  if (account.role === "cliente" && account.clientId) {
    convs = await conversationRepository.listForClient(account.clientId);
  } else if (account.role === "profissional" && account.professionalId) {
    convs = await conversationRepository.listForProfessional(account.professionalId);
  }
  // "Não lida" = há mensagem da outra pessoa depois da última vez que você abriu.
  const myRole = account.role as "cliente" | "profissional";
  const conversations = await Promise.all(
    convs.map(async (c) => {
      let otherName = c.clientName;
      if (account.role === "cliente") {
        const pro = await repository.getById(c.professionalId);
        otherName = pro?.name ?? "profissional";
      }
      const last = c.messages[c.messages.length - 1];
      return {
        id: c.id,
        status: c.status,
        eventType: c.eventType,
        eventDate: c.eventDate,
        professionalId: c.professionalId,
        agreedPrice: c.agreedPrice,
        otherName,
        lastMessage: last?.text ?? "",
        unread: hasUnread(c, myRole),
        createdAt: c.createdAt,
      };
    })
  );
  const unreadCount = conversations.filter((c) => c.unread).length;
  return NextResponse.json({ role: account.role, conversations, unreadCount });
}

export async function POST(request: NextRequest) {
  // Só uma conta de CLIENTE logada pode iniciar conversa (separação de contas).
  const account = await currentAccount((id) => accountRepository.getById(id));
  if (!account) {
    return NextResponse.json({ error: "Entre com sua conta de cliente pra conversar." }, { status: 401 });
  }
  if (account.role !== "cliente") {
    return NextResponse.json(
      { error: "Você está numa conta profissional. Para contratar, entre como cliente." },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const professionalId = String(body.professionalId ?? "");
  // Tipo de evento: uma das sugestões ou texto livre ("Outros").
  const eventType = cleanEventLabel(String(body.eventType ?? ""));
  const eventDate = String(body.eventDate ?? "");
  const eventLocation = String(body.eventLocation ?? "").trim();
  const firstMessage = String(body.message ?? "").trim();

  const errors: string[] = [];
  if (eventType.length < 2) errors.push("Informe o tipo de evento.");
  if (!eventDate) errors.push("Informe a data do evento.");
  if (eventLocation.length < 3) errors.push("Informe o local do evento.");
  if (firstMessage.length < 5) errors.push("Escreva uma mensagem inicial.");

  const professional = await repository.getById(professionalId);
  if (!professional) errors.push("Profissional não encontrado.");

  const client = await clientRepository.getById(account.clientId ?? "");
  if (!client) errors.push("Conta de cliente não encontrada.");

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
    eventType,
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
