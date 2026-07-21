import { NextRequest, NextResponse } from "next/server";
import { accountRepository, conversationRepository } from "@/lib/data";
import { currentAccount } from "@/lib/auth";
import { isAdminAccount } from "@/lib/admin";

/** Admin marca o repasse (PIX manual) ao profissional como feito. */
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
  if (conv.status !== "concluido") {
    return NextResponse.json({ error: "Só concluídas têm repasse." }, { status: 409 });
  }
  if (conv.paidOutAt) {
    return NextResponse.json({ error: "Repasse já marcado." }, { status: 409 });
  }

  const updated = await conversationRepository.markPaidOut(conversationId);
  return NextResponse.json({ paidOutAt: updated?.paidOutAt ?? null });
}
