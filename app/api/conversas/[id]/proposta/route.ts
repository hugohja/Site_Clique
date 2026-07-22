import { NextRequest, NextResponse, after } from "next/server";
import { conversationRepository } from "@/lib/data";
import { resolveConversationViewer } from "@/lib/conversationAuth";
import { notifyProposal } from "@/lib/notify";

/**
 * Envia uma proposta ou contraproposta. O profissional abre o orçamento; a
 * partir daí, o lado que NÃO fez a proposta vigente pode responder com uma
 * contraproposta (ou aceitar). Vai e volta até um dos dois aceitar.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { conversation, role } = await resolveConversationViewer(id);
  if (!conversation) {
    return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  }
  if (role !== "profissional" && role !== "cliente") {
    return NextResponse.json({ error: "Entre com sua conta para negociar." }, { status: 403 });
  }

  if (conversation.status !== "conversando" && conversation.status !== "proposta_enviada") {
    return NextResponse.json(
      { error: "A proposta não pode mais ser alterada nesta etapa." },
      { status: 409 }
    );
  }
  // O primeiro orçamento é sempre do profissional; o cliente entra respondendo.
  // Já com uma proposta na mesa, os dois lados podem mexer: quem propôs pode
  // ajustar o próprio valor e o outro lado pode fazer contraproposta.
  if (conversation.status === "conversando" && role !== "profissional") {
    return NextResponse.json(
      { error: "Aguarde o profissional enviar o orçamento para responder." },
      { status: 409 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Informe um valor válido pra proposta." }, { status: 400 });
  }

  // Snap aos centavos (evita 2000.499999); o valor é sempre positivo já validado.
  const updated = await conversationRepository.sendProposal(id, Math.round(amount * 100) / 100, role);
  if (updated) after(() => notifyProposal(updated, request.nextUrl.origin));
  return NextResponse.json({ status: updated?.status, proposal: updated?.proposal });
}
