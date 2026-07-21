/**
 * Cliente Mercado Pago mínimo (sem dependência externa).
 *
 * Fala direto com a API REST do Mercado Pago via fetch, usando o Access Token
 * no servidor. Cobre a fase de COBRANÇA da custódia: criar um pagamento PIX e
 * consultar o status (o webhook confirma quando o cliente paga).
 *
 * Configuração por variáveis de ambiente:
 *   MP_ACCESS_TOKEN   token de acesso (TEST- no sandbox, APP_USR- em produção)
 *   MP_WEBHOOK_SECRET (opcional) segredo pra validar a assinatura do webhook
 *
 * Sem MP_ACCESS_TOKEN, isMercadoPagoConfigured() = false e o app mantém o
 * pagamento SIMULADO — assim produção não quebra até o token ser configurado.
 */

const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const API = "https://api.mercadopago.com";

export function isMercadoPagoConfigured(): boolean {
  return Boolean(ACCESS_TOKEN);
}

function requireToken(): string {
  if (!ACCESS_TOKEN) throw new Error("Mercado Pago não configurado (MP_ACCESS_TOKEN).");
  return ACCESS_TOKEN;
}

async function mpFetch(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requireToken()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg = typeof body.message === "string" ? body.message : `HTTP ${res.status}`;
    throw new Error(`Mercado Pago ${res.status}: ${msg}`);
  }
  return body;
}

export interface PixCharge {
  id: string;
  status: string; // pending, approved, rejected, cancelled...
  qrCode: string; // "copia e cola"
  qrCodeBase64: string; // imagem do QR (base64 PNG)
  ticketUrl: string; // página de pagamento do MP
  amount: number;
}

/**
 * Cria uma cobrança PIX pelo valor da proposta. `externalReference` é o id da
 * conversa — o webhook usa isso pra achar a conversa e liberar o contato.
 */
export async function mpCreatePixCharge(input: {
  amount: number;
  description: string;
  payerEmail: string;
  externalReference: string;
  idempotencyKey: string;
}): Promise<PixCharge> {
  const body = await mpFetch("/v1/payments", {
    method: "POST",
    headers: { "X-Idempotency-Key": input.idempotencyKey },
    body: JSON.stringify({
      transaction_amount: input.amount,
      description: input.description,
      payment_method_id: "pix",
      external_reference: input.externalReference,
      payer: { email: input.payerEmail },
    }),
  });

  const poi = ((body.point_of_interaction as Record<string, unknown>)?.transaction_data ??
    {}) as Record<string, unknown>;
  return {
    id: String(body.id ?? ""),
    status: String(body.status ?? "pending"),
    qrCode: String(poi.qr_code ?? ""),
    qrCodeBase64: String(poi.qr_code_base64 ?? ""),
    ticketUrl: String(poi.ticket_url ?? ""),
    amount: Number(body.transaction_amount ?? input.amount),
  };
}

export interface MpPayment {
  id: string;
  status: string;
  externalReference: string;
  amount: number;
}

/** Consulta um pagamento pelo id (fonte da verdade — o webhook só avisa). */
export async function mpGetPayment(id: string): Promise<MpPayment> {
  const body = await mpFetch(`/v1/payments/${encodeURIComponent(id)}`, { method: "GET" });
  return {
    id: String(body.id ?? id),
    status: String(body.status ?? ""),
    externalReference: String(body.external_reference ?? ""),
    amount: Number(body.transaction_amount ?? 0),
  };
}
