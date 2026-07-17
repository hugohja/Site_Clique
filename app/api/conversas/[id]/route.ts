import { NextResponse } from "next/server";
import { conversationRepository, repository } from "@/lib/data";
import { toPublicProfessional } from "@/lib/types";

/**
 * Detalhe da conversa. Os contatos dos DOIS lados (WhatsApp do profissional e
 * do cliente) só entram na resposta quando o status é "contato_liberado" —
 * antes disso, nem o JSON carrega os números. O clientWhatsapp guardado na
 * conversa é removido do payload até a liberação.
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

  const released = conversation.status === "contato_liberado";
  // Nunca vaza clientWhatsapp no corpo da conversa; só via `contact` liberado.
  const { clientWhatsapp, ...publicConversation } = conversation;

  return NextResponse.json({
    conversation: publicConversation,
    professional: toPublicProfessional(professional),
    contact: released
      ? { professionalWhatsapp: professional.whatsapp, clientWhatsapp }
      : null,
  });
}
