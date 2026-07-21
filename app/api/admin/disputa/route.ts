import { NextRequest, NextResponse } from "next/server";
import { accountRepository, conversationRepository, repository } from "@/lib/data";
import { currentAccount } from "@/lib/auth";
import { isAdminAccount } from "@/lib/admin";

/**
 * Admin resolve uma disputa de não comparecimento:
 *  "reembolsar" → reembolsa o cliente e a nota do profissional cai (noShowCount++)
 *  "liberar"    → libera o pagamento ao profissional (relato improcedente)
 */
export async function POST(request: NextRequest) {
  const account = await currentAccount((id) => accountRepository.getById(id));
  if (!isAdminAccount(account)) {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }

  let body: { conversationId?: string; outcome?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const { conversationId, outcome } = body;
  if (!conversationId || (outcome !== "reembolsar" && outcome !== "liberar")) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  const conv = await conversationRepository.getById(conversationId);
  if (!conv) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  if (conv.status !== "em_disputa") {
    return NextResponse.json({ error: "Esta conversa não está em disputa." }, { status: 409 });
  }

  const updated = await conversationRepository.resolveDispute(conversationId, outcome);
  if (outcome === "reembolsar" && updated?.status === "reembolsado") {
    await repository.registerNoShow(conv.professionalId);
  }
  return NextResponse.json({ status: updated?.status });
}
