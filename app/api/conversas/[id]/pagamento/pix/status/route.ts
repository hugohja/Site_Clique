import { NextResponse } from "next/server";
import { confirmarPagamento } from "@/lib/payments";
import { resolveConversationViewer } from "@/lib/conversationAuth";
import { isMercadoPagoConfigured, mpSearchPaymentByReference } from "@/lib/mercadopago";

/**
 * Status do PIX (Mercado Pago) da conversa — o checkout consulta em loop pra
 * confirmar "na hora". Busca o pagamento pelo external_reference (id da conversa)
 * e, se estiver aprovado, libera o contato aqui mesmo, sem depender do webhook
 * (que continua valendo como reforço). Idempotente: confirmarPagamento só age
 * enquanto a conversa está em "proposta_aceita". Só o cliente da conversa acompanha.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { conversation, role } = await resolveConversationViewer(id);
  if (!conversation) {
    return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  }
  if (role !== "cliente") {
    return NextResponse.json({ error: "Só o cliente acompanha o pagamento." }, { status: 403 });
  }

  // Já avançou (webhook ou consulta anterior liberou o contato) — nada a fazer.
  if (conversation.status !== "proposta_aceita") {
    return NextResponse.json({ status: conversation.status, paid: true });
  }
  if (!isMercadoPagoConfigured()) {
    return NextResponse.json({ status: conversation.status, paid: false });
  }

  try {
    const payment = await mpSearchPaymentByReference(id);
    if (payment?.status === "approved") {
      const updated = await confirmarPagamento(id);
      return NextResponse.json({ status: updated?.status ?? "contato_liberado", paid: true });
    }
    return NextResponse.json({
      status: conversation.status,
      paid: false,
      mpStatus: payment?.status ?? "pending",
    });
  } catch {
    // Uma falha momentânea com o MP não deve derrubar o checkout — segue aguardando.
    return NextResponse.json({ status: conversation.status, paid: false });
  }
}
