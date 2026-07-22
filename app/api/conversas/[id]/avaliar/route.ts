import { NextRequest, NextResponse } from "next/server";
import { clientRepository, repository, reviewRepository } from "@/lib/data";
import { resolveConversationViewer } from "@/lib/conversationAuth";
import { cleanRating } from "@/lib/types";

/**
 * O cliente avalia o profissional depois do serviço concluído. Uma avaliação
 * por conversa; só o cliente daquela conversa; só em status "concluido".
 * Recalcula a nota média e a contagem do profissional.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { conversation, role } = await resolveConversationViewer(id);
  if (!conversation) {
    return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  }
  if (role !== "cliente") {
    return NextResponse.json({ error: "Só o cliente avalia o serviço." }, { status: 403 });
  }
  if (conversation.status !== "concluido") {
    return NextResponse.json(
      { error: "A avaliação fica disponível depois que o serviço é concluído." },
      { status: 409 }
    );
  }

  const existing = await reviewRepository.getByConversation(id);
  if (existing) {
    return NextResponse.json({ error: "Você já avaliou este serviço." }, { status: 409 });
  }

  let body: { rating?: unknown; comment?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const rating = cleanRating(Number(body.rating));
  if (rating < 1) {
    return NextResponse.json({ error: "Escolha de 1 a 5 estrelas." }, { status: 400 });
  }
  const comment = String(body.comment ?? "").trim().slice(0, 600);

  const client = await clientRepository.getById(conversation.clientId);
  const review = await reviewRepository.create({
    conversationId: id,
    professionalId: conversation.professionalId,
    clientId: conversation.clientId,
    clientName: client?.name ?? conversation.clientName,
    rating,
    comment,
  });

  // Recalcula a nota média do profissional.
  const all = await reviewRepository.listByProfessional(conversation.professionalId);
  const avg = all.reduce((s, r) => s + r.rating, 0) / all.length;
  await repository.updateRating(conversation.professionalId, Math.round(avg * 10) / 10, all.length);

  return NextResponse.json({ review });
}
