import { NextResponse } from "next/server";
import { accountRepository, conversationRepository } from "@/lib/data";
import { currentAccount } from "@/lib/auth";
import { hasUnread, type Conversation } from "@/lib/types";

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
  const myRole = account.role as "cliente" | "profissional";
  const count = convs.filter((c) => hasUnread(c, myRole)).length;
  return NextResponse.json({ count });
}
