import { NextRequest, NextResponse } from "next/server";
import { conversationRepository } from "@/lib/data";
import { resolveConversationViewer } from "@/lib/conversationAuth";

/**
 * Profissional conclui o serviço informando o código de confirmação que o
 * cliente passa no evento. Código certo → dinheiro sai da custódia pro
 * profissional (menos a comissão).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { conversation, role } = await resolveConversationViewer(id);
  if (!conversation) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  if (role !== "profissional") {
    return NextResponse.json({ error: "Só o profissional conclui o atendimento." }, { status: 403 });
  }
  if (conversation.status !== "contato_liberado") {
    return NextResponse.json({ error: "Esta conversa não está aguardando conclusão." }, { status: 409 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const code = String(body.code ?? "").trim();
  if (!/^\d{4}$/.test(code)) {
    return NextResponse.json({ error: "Informe o código de 4 dígitos." }, { status: 400 });
  }

  const updated = await conversationRepository.confirmCompletion(id, code);
  if (updated?.status !== "concluido") {
    return NextResponse.json(
      { error: "Código incorreto. Peça o código ao cliente no local do evento." },
      { status: 400 }
    );
  }
  return NextResponse.json({ status: updated.status });
}
