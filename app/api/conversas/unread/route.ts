import { NextResponse } from "next/server";
import { accountRepository, conversationRepository } from "@/lib/data";
import { currentAccount } from "@/lib/auth";
import type { Conversation } from "@/lib/types";

/** Contador leve de conversas "não lidas" (última mensagem da outra pessoa) — pro selo no menu. */
export async function GET() {
  const account = await currentAccount((id) => accountRepository.getById(id));
  if (!account) return NextResponse.json({ count: 0 });

  let convs: Conversation[] = [];
  if (account.role === "cliente" && account.clientId) {
    convs = await conversationRepository.listForClient(account.clientId);
  } else if (account.role === "profissional" && account.professionalId) {
    convs = await conversationRepository.listForProfessional(account.professionalId);
  }
  const otherRole = account.role === "cliente" ? "profissional" : "cliente";
  const count = convs.filter((c) => {
    const last = c.messages[c.messages.length - 1];
    return last?.sender === otherRole;
  }).length;
  return NextResponse.json({ count });
}
