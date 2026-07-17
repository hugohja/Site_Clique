import { NextResponse } from "next/server";
import { repository } from "@/lib/data";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const professional = await repository.getById(id);
  if (!professional) {
    return NextResponse.json({ error: "Profissional não encontrado." }, { status: 404 });
  }
  return NextResponse.json(professional);
}
