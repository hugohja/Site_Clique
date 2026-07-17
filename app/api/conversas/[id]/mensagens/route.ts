import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { conversationRepository } from "@/lib/data";
import { censorContactAttempts } from "@/lib/moderation";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const sender = body.sender === "profissional" ? "profissional" : "cliente";
  const text = String(body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
  }
  if (text.length > 2000) {
    return NextResponse.json({ error: "Mensagem longa demais (máx. 2000 caracteres)." }, { status: 400 });
  }

  // Filtro anti-contato roda no servidor, sempre — o cliente não decide isso.
  const moderated = censorContactAttempts(text);

  const conversation = await conversationRepository.addMessage(id, {
    id: randomUUID(),
    sender,
    text: moderated.text,
    filtered: moderated.filtered,
    createdAt: new Date().toISOString(),
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, filtered: moderated.filtered }, { status: 201 });
}
