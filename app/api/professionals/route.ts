import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/lib/data";
import { CITIES, EVENT_TYPES, type ProfessionalInput } from "@/lib/types";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const professionals = await repository.list({
    city: params.get("cidade") ?? undefined,
    eventType: params.get("evento") ?? undefined,
    type: params.get("tipo") ?? undefined,
  });
  return NextResponse.json(professionals);
}

export async function POST(request: NextRequest) {
  let body: Partial<ProfessionalInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const errors: string[] = [];
  const name = String(body.name ?? "").trim();
  const bio = String(body.bio ?? "").trim();
  const whatsapp = String(body.whatsapp ?? "").replace(/\D/g, "");
  const priceFrom = Number(body.priceFrom);
  const specialties = Array.isArray(body.specialties) ? body.specialties : [];

  if (name.length < 2) errors.push("Informe o nome.");
  if (!CITIES.includes(body.city as never)) errors.push("Cidade inválida.");
  if (body.type !== "fotografo" && body.type !== "filmmaker") errors.push("Tipo inválido.");
  if (specialties.length === 0 || !specialties.every((s) => EVENT_TYPES.includes(s as never)))
    errors.push("Escolha ao menos uma especialidade válida.");
  if (!Number.isFinite(priceFrom) || priceFrom <= 0) errors.push("Informe um preço válido.");
  if (whatsapp.length < 10 || whatsapp.length > 15) errors.push("WhatsApp inválido (use DDD + número).");
  if (bio.length < 10) errors.push("Escreva uma bio de pelo menos 10 caracteres.");

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  const professional = await repository.create({
    name,
    city: body.city as never,
    type: body.type as "fotografo" | "filmmaker",
    specialties: specialties as never,
    priceFrom: Math.round(priceFrom),
    // Sem DDI, assume Brasil.
    whatsapp: whatsapp.length <= 11 ? `55${whatsapp}` : whatsapp,
    bio,
  });

  return NextResponse.json(professional, { status: 201 });
}
