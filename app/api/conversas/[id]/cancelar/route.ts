import { NextResponse } from "next/server";
import { conversationRepository } from "@/lib/data";
import { resolveConversationViewer } from "@/lib/conversationAuth";

/**
 * Cancela a contratação antes do evento. Cliente ou profissional da conversa
 * podem cancelar. Antes do pagamento vira "cancelado"; com pagamento envolvido,
 * vira disputa para a Clique reembolsar (não libera dinheiro automaticamente).
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { conversation, role } = await resolveConversationViewer(id);
  if (!conversation) {
    return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  }
  if (role !== "cliente" && role !== "profissional") {
    return NextResponse.json({ error: "Entre com sua conta para cancelar." }, { status: 403 });
  }
  const cancelable = [
    "conversando",
    "proposta_enviada",
    "proposta_aceita",
    "pagamento_confirmado",
    "contato_liberado",
  ];
  if (!cancelable.includes(conversation.status)) {
    return NextResponse.json(
      { error: "Esta contratação não pode mais ser cancelada." },
      { status: 409 }
    );
  }

  const updated = await conversationRepository.cancelConversation(id, role);
  return NextResponse.json({ status: updated?.status });
}
