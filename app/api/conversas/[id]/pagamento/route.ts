import { NextResponse } from "next/server";
import { informarPagamento } from "@/lib/payments";
import { resolveConversationViewer } from "@/lib/conversationAuth";

/**
 * Cobrança MANUAL: o cliente informa que fez o PIX na chave da Clique. A
 * conversa vai pra "pagamento_confirmado" (aguardando a Clique conferir o
 * recebimento) — o contato NÃO é liberado aqui. Sempre pelo valor da proposta
 * aceita registrada; sem proposta aceita, não há o que pagar.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { conversation: existing, role } = await resolveConversationViewer(id);
  if (!existing) {
    return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  }
  if (role !== "cliente") {
    return NextResponse.json({ error: "Só o cliente confirma o pagamento." }, { status: 403 });
  }
  if (existing.status === "pagamento_confirmado" || existing.status === "contato_liberado") {
    return NextResponse.json({ error: "Pagamento já informado nesta conversa." }, { status: 409 });
  }
  if (existing.status !== "proposta_aceita" || !existing.proposal?.acceptedAt) {
    return NextResponse.json(
      { error: "O pagamento só é liberado depois que uma proposta é aceita dentro da plataforma." },
      { status: 409 }
    );
  }

  const conversation = await informarPagamento(id);
  return NextResponse.json({ status: conversation?.status });
}
