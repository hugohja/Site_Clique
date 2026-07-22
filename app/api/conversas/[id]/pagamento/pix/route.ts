import { NextResponse } from "next/server";
import { clientRepository, repository } from "@/lib/data";
import { resolveConversationViewer } from "@/lib/conversationAuth";
import { isMercadoPagoConfigured, mpCreatePixCharge } from "@/lib/mercadopago";

/**
 * Cria a cobrança PIX (Mercado Pago) pelo valor da proposta aceita. Só o
 * cliente da conversa, com a proposta aceita, pode gerar. O contato NÃO é
 * liberado aqui — isso acontece no webhook, quando o MP confirma o pagamento.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isMercadoPagoConfigured()) {
    return NextResponse.json({ error: "PIX indisponível nesta configuração." }, { status: 501 });
  }

  // Tentativa: a mesma tentativa é idempotente (evita PIX duplicado em cliques
  // repetidos); uma nova tentativa (após expirar) gera um PIX novo.
  let attempt = 1;
  try {
    const body = (await request.json().catch(() => ({}))) as { attempt?: unknown };
    const n = Number(body.attempt);
    if (Number.isFinite(n) && n >= 1 && n <= 100) attempt = Math.floor(n);
  } catch {
    /* sem corpo — tentativa 1 */
  }

  const { conversation, role } = await resolveConversationViewer(id);
  if (!conversation) {
    return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  }
  if (role !== "cliente") {
    return NextResponse.json({ error: "Só o cliente confirma o pagamento." }, { status: 403 });
  }
  if (conversation.status !== "proposta_aceita" || !conversation.proposal?.acceptedAt) {
    return NextResponse.json(
      { error: "O pagamento só é liberado depois que uma proposta é aceita dentro da plataforma." },
      { status: 409 }
    );
  }

  const amount = conversation.proposal.amount;
  const [client, pro] = await Promise.all([
    clientRepository.getById(conversation.clientId),
    repository.getById(conversation.professionalId),
  ]);
  const payerEmail = client?.email || "cliente@clique.app";

  try {
    const charge = await mpCreatePixCharge({
      amount,
      description: `Clique · ${conversation.eventType} · ${pro?.name ?? "profissional"}`,
      payerEmail,
      externalReference: conversation.id,
      // Idempotente por tentativa: cliques repetidos na mesma tentativa não
      // duplicam; após expirar, o cliente pede outra tentativa (novo PIX).
      idempotencyKey: `pix-${conversation.id}-${attempt}`,
      expiresInMinutes: 30,
    });
    return NextResponse.json({
      qrCode: charge.qrCode,
      qrCodeBase64: charge.qrCodeBase64,
      ticketUrl: charge.ticketUrl,
      amount: charge.amount,
      expiresAt: charge.expiresAt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Falha ao criar a cobrança PIX.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
