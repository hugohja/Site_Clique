import { NextResponse } from "next/server";
import { conversationRepository } from "@/lib/data";
import { resolveConversationViewer } from "@/lib/conversationAuth";

/** Cliente reporta que o profissional NÃO compareceu — abre disputa (admin analisa). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { conversation, role } = await resolveConversationViewer(id);
  if (!conversation) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  if (role !== "cliente") {
    return NextResponse.json({ error: "Só o cliente pode reportar." }, { status: 403 });
  }
  if (conversation.status !== "contato_liberado") {
    return NextResponse.json(
      { error: "Só dá pra reportar após o pagamento e antes da conclusão." },
      { status: 409 }
    );
  }
  const updated = await conversationRepository.reportNoShow(id);
  return NextResponse.json({ status: updated?.status });
}
