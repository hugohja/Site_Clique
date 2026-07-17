import { NextResponse } from "next/server";
import { repository } from "@/lib/data";
import { toPublicProfessional } from "@/lib/types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const professional = await repository.getById(id);
  if (!professional) {
    return NextResponse.json({ error: "Profissional não encontrado." }, { status: 404 });
  }
  // Contato fica fora da resposta pública — só sai via conversa liberada.
  return NextResponse.json(toPublicProfessional(professional));
}
