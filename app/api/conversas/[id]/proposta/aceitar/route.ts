import { NextResponse } from "next/server";
import { conversationRepository } from "@/lib/data";
import { resolveConversationViewer } from "@/lib/conversationAuth";

/**
 * Aceita a proposta vigente — só a partir daqui o pagamento é liberado.
 * Quem aceita é sempre o lado que NÃO fez a proposta atual (o cliente aceita o
 * orçamento do profissional; o profissional aceita a contraproposta do cliente).
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { conversation, role } = await resolveConversationViewer(id);
  if (!conversation) {
    return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  }
  if (role !== "cliente" && role !== "profissional") {
    return NextResponse.json({ error: "Entre com sua conta para aceitar a proposta." }, { status: 403 });
  }
  if (conversation.status !== "proposta_enviada" || !conversation.proposal) {
    return NextResponse.json(
      { error: "Não há proposta pendente de aceite nesta conversa." },
      { status: 409 }
    );
  }
  if (conversation.proposal.by === role) {
    return NextResponse.json(
      { error: "Você não pode aceitar a própria proposta — aguarde a resposta do outro lado." },
      { status: 409 }
    );
  }

  const updated = await conversationRepository.acceptProposal(id);
  return NextResponse.json({ status: updated?.status, proposal: updated?.proposal });
}
