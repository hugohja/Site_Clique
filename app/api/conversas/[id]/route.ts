import { NextResponse } from "next/server";
import { accountRepository, conversationRepository, repository } from "@/lib/data";
import { PAID_STATUSES, toPublicProfessional } from "@/lib/types";
import { currentAccount } from "@/lib/auth";
import { viewerRoleFor } from "@/lib/conversationAuth";

/**
 * Detalhe da conversa. O papel de quem vê vem da SESSÃO. O contato dos dois
 * lados só entra quando o dinheiro já está em custódia (PAID_STATUSES); o
 * código de confirmação SÓ vai pro cliente; o clientWhatsapp nunca vaza no
 * corpo (só via `contact`).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conversation = await conversationRepository.getById(id);
  if (!conversation) {
    return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  }

  const professional = await repository.getById(conversation.professionalId);
  if (!professional) {
    return NextResponse.json({ error: "Profissional não encontrado." }, { status: 404 });
  }

  const account = await currentAccount((aid) => accountRepository.getById(aid));
  const role = viewerRoleFor(account, conversation);
  if (!role) {
    return NextResponse.json({ error: "Entre com sua conta para ver esta conversa." }, { status: 403 });
  }

  const paid = PAID_STATUSES.includes(conversation.status);
  const { clientWhatsapp, confirmationCode, ...rest } = conversation;

  return NextResponse.json({
    viewerRole: role,
    conversation: {
      ...rest,
      // Código só é revelado ao cliente (ele passa ao profissional no evento).
      confirmationCode: role === "cliente" ? confirmationCode : null,
    },
    professional: toPublicProfessional(professional),
    contact: paid ? { professionalWhatsapp: professional.whatsapp, clientWhatsapp } : null,
  });
}
