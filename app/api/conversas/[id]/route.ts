import { NextResponse } from "next/server";
import { conversationRepository, repository } from "@/lib/data";
import { toPublicProfessional } from "@/lib/types";

/**
 * Detalhe da conversa. O contato do profissional SÓ entra na resposta quando
 * o status é "contato_liberado" — antes disso, nem o JSON carrega o número.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conversation = await conversationRepository.getById(id);
  if (!conversation) {
    return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  }

  const professional = await repository.getById(conversation.professionalId);
  if (!professional) {
    return NextResponse.json({ error: "Profissional não encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    conversation,
    professional: toPublicProfessional(professional),
    contact:
      conversation.status === "contato_liberado"
        ? { whatsapp: professional.whatsapp }
        : null,
  });
}
