import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/lib/data";
import { CITIES, EVENT_TYPES, GENDERS, toPublicProfessional } from "@/lib/types";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const professionals = await repository.list({
    city: params.get("cidade") ?? undefined,
    eventType: params.get("evento") ?? undefined,
    type: params.get("tipo") ?? undefined,
  });
  // Nunca expor contato ou dados sensíveis em endpoint público.
  return NextResponse.json(professionals.map(toPublicProfessional));
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_PORTFOLIO_FILES = 12;

async function fileToDataUrl(file: File): Promise<string | { error: string }> {
  if (!file.type.startsWith("image/")) {
    return { error: `"${file.name}" não é uma imagem.` };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: `"${file.name}" passa de 4 MB.` };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Envie o formulário completo." }, { status: 400 });
  }

  const errors: string[] = [];
  const name = String(form.get("name") ?? "").trim();
  const city = String(form.get("city") ?? "");
  const type = String(form.get("type") ?? "");
  const bio = String(form.get("bio") ?? "").trim();
  const whatsapp = String(form.get("whatsapp") ?? "").replace(/\D/g, "");
  const cpf = String(form.get("cpf") ?? "").replace(/\D/g, "");
  const gender = String(form.get("gender") ?? "");
  const priceFrom = Number(form.get("priceFrom"));
  const specialties = form.getAll("specialties").map(String);

  if (name.length < 2) errors.push("Informe o nome.");
  if (!CITIES.includes(city as never)) errors.push("Cidade inválida.");
  if (type !== "fotografo" && type !== "filmmaker") errors.push("Tipo inválido.");
  if (specialties.length === 0 || !specialties.every((s) => EVENT_TYPES.includes(s as never)))
    errors.push("Escolha ao menos uma especialidade válida.");
  if (!Number.isFinite(priceFrom) || priceFrom <= 0) errors.push("Informe um preço válido.");
  if (whatsapp.length < 10 || whatsapp.length > 15) errors.push("WhatsApp inválido (use DDD + número).");
  // Validação de dígito verificador fica pra fase 2 — aqui só o formato.
  if (cpf.length !== 11) errors.push("CPF incompleto (use o formato 000.000.000-00).");
  if (!GENDERS.some((g) => g.value === gender)) errors.push("Selecione o gênero.");
  if (bio.length < 10) errors.push("Escreva uma bio de pelo menos 10 caracteres.");

  // Foto de perfil (opcional nesta fase).
  let profilePhotoUrl: string | null = null;
  const profilePhoto = form.get("profilePhoto");
  if (profilePhoto instanceof File && profilePhoto.size > 0) {
    const result = await fileToDataUrl(profilePhoto);
    if (typeof result === "string") profilePhotoUrl = result;
    else errors.push(result.error);
  }

  // Fotos de portfólio (opcionais; sem elas o perfil usa placeholders).
  const portfolioUrls: string[] = [];
  const portfolioFiles = form
    .getAll("portfolioPhotos")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (portfolioFiles.length > MAX_PORTFOLIO_FILES) {
    errors.push(`Envie no máximo ${MAX_PORTFOLIO_FILES} fotos de portfólio.`);
  } else {
    for (const file of portfolioFiles) {
      const result = await fileToDataUrl(file);
      if (typeof result === "string") portfolioUrls.push(result);
      else errors.push(result.error);
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  const professional = await repository.create({
    name,
    city: city as never,
    type: type as "fotografo" | "filmmaker",
    specialties: specialties as never,
    priceFrom: Math.round(priceFrom),
    // Sem DDI, assume Brasil.
    whatsapp: whatsapp.length <= 11 ? `55${whatsapp}` : whatsapp,
    cpf,
    gender: gender as never,
    profilePhotoUrl,
    portfolioUrls,
    bio,
  });

  // Resposta pública: sem WhatsApp, CPF ou gênero.
  return NextResponse.json(toPublicProfessional(professional), { status: 201 });
}
