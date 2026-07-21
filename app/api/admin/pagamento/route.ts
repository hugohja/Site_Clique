import { NextRequest, NextResponse } from "next/server";
import { accountRepository, conversationRepository } from "@/lib/data";
import { confirmarRecebimento } from "@/lib/payments";
import { currentAccount } from "@/lib/auth";
import { isAdminAccount } from "@/lib/admin";

/**
 * Cobrança manual: admin confirma que o PIX do cliente caiu na conta da Clique.
 * Só então o contato é liberado e o código de custódia é gerado.
 */
export async function POST(request: NextRequest) {
  const account = await currentAccount((id) => accountRepository.getById(id));
  if (!isAdminAccount(account)) {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }

  let body: { conversationId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const conversationId = String(body.conversationId ?? "");
  if (!conversationId) {
    return NextResponse.json({ error: "Informe a conversa." }, { status: 400 });
  }

  const conv = await conversationRepository.getById(conversationId);
  if (!conv) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  if (conv.status !== "pagamento_confirmado") {
    return NextResponse.json(
      { error: "Esta conversa não está aguardando confirmação de pagamento." },
      { status: 409 }
    );
  }

  const updated = await confirmarRecebimento(conversationId);
  return NextResponse.json({ status: updated?.status });
}
