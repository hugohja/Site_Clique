import { NextResponse } from "next/server";
import { clientRepository } from "@/lib/data";
import { toPublicClient } from "@/lib/types";

/** Versão pública do cliente (sem contato/identidade) — usada pra confirmar o "usuário atual". */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await clientRepository.getById(id);
  if (!client) {
    return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  }
  return NextResponse.json(toPublicClient(client));
}
