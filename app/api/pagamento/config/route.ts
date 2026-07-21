import { NextResponse } from "next/server";
import { isMercadoPagoConfigured } from "@/lib/mercadopago";

/** Diz ao checkout se o PIX real (Mercado Pago) está ativo ou se é simulação. */
export async function GET() {
  return NextResponse.json({ pixEnabled: isMercadoPagoConfigured() });
}
