import { NextResponse } from "next/server";
import { isMercadoPagoConfigured } from "@/lib/mercadopago";

/**
 * Diz ao checkout qual modo de cobrança está ativo:
 *  - pixEnabled: PIX automático via Mercado Pago (precisa do MP_ACCESS_TOKEN)
 *  - senão, cobrança MANUAL: mostra a chave PIX fixa da Clique (CLIQUE_PIX_KEY)
 *    e o cliente confirma o pagamento (a Clique confere depois).
 */
export async function GET() {
  const pixEnabled = isMercadoPagoConfigured();
  return NextResponse.json({
    pixEnabled,
    manualPixKey: pixEnabled ? null : process.env.CLIQUE_PIX_KEY ?? "",
  });
}
