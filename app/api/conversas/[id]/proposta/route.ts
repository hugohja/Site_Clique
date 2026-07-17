import { NextRequest, NextResponse } from "next/server";
import { conversationRepository } from "@/lib/data";

/** Profissional envia (ou substitui) a proposta de valor estruturada. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const conversation = await conversationRepository.getById(id);
  if (!conversation) {
    return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  }
  if (conversation.status !== "conversando" && conversation.status !== "proposta_enviada") {
    return NextResponse.json(
      { error: "A proposta não pode mais ser alterada nesta etapa." },
      { status: 409 }
    );
  }

  const updated = await conversationRepository.sendProposal(id, Math.round(amount));
  return NextResponse.json({ status: updated?.status, proposal: updated?.proposal });
}
