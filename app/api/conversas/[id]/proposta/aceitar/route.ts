import { NextResponse } from "next/server";
import { conversationRepository } from "@/lib/data";
import { resolveConversationViewer } from "@/lib/conversationAuth";

/** Cliente aceita a proposta vigente — só a partir daqui o pagamento é liberado. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { conversation, role } = await resolveConversationViewer(id);
  if (!conversation) {
    return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  }
  if (role !== "cliente") {
    return NextResponse.json({ error: "Só o cliente aceita a proposta." }, { status: 403 });
  }
  if (conversation.status !== "proposta_enviada" || !conversation.proposal) {
    return NextResponse.json(
      { error: "Não há proposta pendente de aceite nesta conversa." },
      { status: 409 }
    );
  }

  const updated = await conversationRepository.acceptProposal(id);
  return NextResponse.json({ status: updated?.status, proposal: updated?.proposal });
}
