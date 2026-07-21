import { NextRequest, NextResponse } from "next/server";
import { conversationRepository } from "@/lib/data";
import { confirmarPagamento } from "@/lib/payments";
import { isMercadoPagoConfigured, mpGetPayment } from "@/lib/mercadopago";

/**
 * Webhook do Mercado Pago: chega quando um pagamento muda de status.
 *
 * Não confiamos no corpo da notificação — buscamos o pagamento no MP pelo id
 * (com nosso token) e só liberamos o contato se ele estiver 'approved'. O
 * external_reference é o id da conversa, gravado na criação da cobrança PIX.
 *
 * Idempotente: se a conversa já saiu de 'proposta_aceita', confirmarPagamento
 * não faz nada — reentregas do webhook são inofensivas.
 */
export async function POST(request: NextRequest) {
  if (!isMercadoPagoConfigured()) {
    return NextResponse.json({ ok: true, ignored: "mp-not-configured" });
  }

  // O MP manda o id do pagamento no corpo (data.id) e/ou na query (?id=&topic=).
  let paymentId = "";
  const type = request.nextUrl.searchParams.get("type") ?? request.nextUrl.searchParams.get("topic");
  const queryId = request.nextUrl.searchParams.get("data.id") ?? request.nextUrl.searchParams.get("id");
  try {
    const body = (await request.json().catch(() => ({}))) as {
      type?: string;
      data?: { id?: string | number };
    };
    paymentId = String(body.data?.id ?? queryId ?? "");
    if (body.type && body.type !== "payment" && type !== "payment") {
      return NextResponse.json({ ok: true, ignored: body.type });
    }
  } catch {
    paymentId = String(queryId ?? "");
  }
  if (!paymentId) return NextResponse.json({ ok: true, ignored: "no-id" });

  try {
    const payment = await mpGetPayment(paymentId);
    if (payment.status !== "approved") {
      return NextResponse.json({ ok: true, status: payment.status });
    }
    const conversationId = payment.externalReference;
    if (!conversationId) return NextResponse.json({ ok: true, ignored: "no-ref" });

    const conv = await conversationRepository.getById(conversationId);
    if (!conv) return NextResponse.json({ ok: true, ignored: "conv-not-found" });

    // Confirma o pagamento e libera o contato (idempotente).
    if (conv.status === "proposta_aceita") {
      await confirmarPagamento(conversationId);
    }
    return NextResponse.json({ ok: true, confirmed: conversationId });
  } catch (err) {
    // 500 faz o MP reentregar — melhor que perder a confirmação.
    const msg = err instanceof Error ? err.message : "erro";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
