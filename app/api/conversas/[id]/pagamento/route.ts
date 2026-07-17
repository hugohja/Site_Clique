import { NextRequest, NextResponse } from "next/server";
import { conversationRepository } from "@/lib/data";
import { confirmarPagamento } from "@/lib/payments";

/**
 * Simulação de pagamento da fase atual. Quando o gateway real entrar (fase 3),
 * esta rota passa a criar a cobrança e a liberação move pro webhook — ver
 * lib/payments.ts.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const agreedPrice = Number(body.agreedPrice);
  if (!Number.isFinite(agreedPrice) || agreedPrice <= 0) {
    return NextResponse.json({ error: "Informe o valor fechado com o profissional." }, { status: 400 });
  }

  const existing = await conversationRepository.getById(id);
  if (!existing) {
    return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  }
  if (existing.status !== "conversando") {
    return NextResponse.json({ error: "Pagamento já confirmado nesta conversa." }, { status: 409 });
  }

  const conversation = await confirmarPagamento(id, Math.round(agreedPrice));
  return NextResponse.json({ status: conversation?.status }, { status: 200 });
}
