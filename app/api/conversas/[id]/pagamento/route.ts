import { NextResponse } from "next/server";
import { conversationRepository } from "@/lib/data";
import { confirmarPagamento } from "@/lib/payments";

/**
 * Simulação de pagamento da fase atual. Não recebe valor: o pagamento é
 * SEMPRE pelo valor da proposta aceita registrada na conversa — sem proposta
 * aceita, não há o que pagar (o passo não pode ser pulado).
 *
 * Quando o gateway real entrar (fase 3), esta rota passa a criar a cobrança
 * e a liberação move pro webhook — ver lib/payments.ts.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const existing = await conversationRepository.getById(id);
  if (!existing) {
    return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  }
  if (existing.status === "pagamento_confirmado" || existing.status === "contato_liberado") {
    return NextResponse.json({ error: "Pagamento já confirmado nesta conversa." }, { status: 409 });
  }
  if (existing.status !== "proposta_aceita" || !existing.proposal?.acceptedAt) {
    return NextResponse.json(
      { error: "O pagamento só é liberado depois que uma proposta é aceita dentro da plataforma." },
      { status: 409 }
    );
  }

  const conversation = await confirmarPagamento(id);
  return NextResponse.json({ status: conversation?.status });
}
