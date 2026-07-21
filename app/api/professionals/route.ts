import { NextRequest, NextResponse } from "next/server";
import { accountRepository, repository } from "@/lib/data";
import {
  DOCUMENT_TYPES,
  GENDERS,
  MAX_PORTFOLIO_PHOTOS,
  MAX_SPECIALTIES,
  MIN_PORTFOLIO_PHOTOS,
  cleanEventLabel,
  isValidCity,
  type PortfolioPhotoInput,
  toPublicProfessional,
} from "@/lib/types";
import { isImageFile } from "@/lib/upload";
import { storeImage } from "@/lib/storage";
import { SESSION_COOKIE, createSession, hashPassword } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const professionals = await repository.list({
    city: params.get("cidade") ?? undefined,
    eventType: params.get("evento") ?? undefined,
    type: params.get("tipo") ?? undefined,
  });
  // Nunca expor contato/identidade em endpoint público.
  return NextResponse.json(professionals.map(toPublicProfessional));
}

const ASPECTS = ["wide", "tall", "square"] as const;

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
  const loginEmail = String(form.get("loginEmail") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const bio = String(form.get("bio") ?? "").trim();
  const whatsapp = String(form.get("whatsapp") ?? "").replace(/\D/g, "");
  const cpf = String(form.get("cpf") ?? "").replace(/\D/g, "");
  const gender = String(form.get("gender") ?? "");
  const birthDate = String(form.get("birthDate") ?? "").trim();
  const documentType = String(form.get("documentType") ?? "");
  // Especialidades: sugestões marcadas + quaisquer "outras" digitadas (texto livre).
  const specialties = Array.from(
    new Set(form.getAll("specialties").map((s) => cleanEventLabel(String(s))).filter(Boolean))
  ).slice(0, MAX_SPECIALTIES);

  if (name.length < 2) errors.push("Informe o nome.");
  if (!isValidCity(city)) errors.push("Escolha uma cidade válida (Nome – UF).");
  if (!["fotografo", "filmmaker", "editor"].includes(type)) errors.push("Tipo inválido.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(loginEmail)) errors.push("E-mail de login inválido.");
  if (password.length < 6) errors.push("A senha precisa ter ao menos 6 caracteres.");
  if (specialties.length === 0) errors.push("Escolha ou escreva ao menos uma especialidade.");
  if (whatsapp.length < 10 || whatsapp.length > 15) errors.push("WhatsApp inválido (use DDD + número).");
  if (cpf.length !== 11) errors.push("CPF incompleto (use o formato 000.000.000-00).");
  if (!GENDERS.some((g) => g.value === gender)) errors.push("Selecione o gênero.");
  if (!DOCUMENT_TYPES.some((d) => d.value === documentType)) errors.push("Selecione o tipo de documento.");
  if (bio.length < 10) errors.push("Escreva uma bio de pelo menos 10 caracteres.");

  if (loginEmail && (await accountRepository.getByEmail(loginEmail))) {
    errors.push("Já existe uma conta com esse e-mail.");
  }

  let profilePhotoUrl = "";
  const profilePhoto = form.get("profilePhoto");
  if (!isImageFile(profilePhoto)) errors.push("A foto de perfil é obrigatória.");
  else {
    const r = await storeImage(profilePhoto, "profile");
    if ("url" in r) profilePhotoUrl = r.url;
    else errors.push(r.error);
  }

  let documentPhotoUrl = "";
  const documentPhoto = form.get("documentPhoto");
  if (!isImageFile(documentPhoto)) errors.push("Anexe a foto do documento (RG, CNH ou passaporte).");
  else {
    const r = await storeImage(documentPhoto, "document");
    if ("url" in r) documentPhotoUrl = r.url;
    else errors.push(r.error);
  }

  // Portfólio: fotos + metadados (formato + capa) paralelos, na ordem escolhida.
  let meta: { aspect?: string; cover?: boolean }[] = [];
  try {
    meta = JSON.parse(String(form.get("portfolioMeta") ?? "[]"));
  } catch {
    meta = [];
  }
  const portfolioFiles = form.getAll("portfolioPhotos").filter(isImageFile);
  const portfolio: PortfolioPhotoInput[] = [];
  if (portfolioFiles.length < MIN_PORTFOLIO_PHOTOS) {
    errors.push(`Envie ao menos ${MIN_PORTFOLIO_PHOTOS} fotos de portfólio.`);
  } else if (portfolioFiles.length > MAX_PORTFOLIO_PHOTOS) {
    errors.push(`Envie no máximo ${MAX_PORTFOLIO_PHOTOS} fotos de portfólio.`);
  } else {
    for (let i = 0; i < portfolioFiles.length; i++) {
      const r = await storeImage(portfolioFiles[i], "portfolio");
      if ("url" in r) {
        const m = meta[i] ?? {};
        portfolio.push({
          url: r.url,
          aspect: ASPECTS.includes(m.aspect as never) ? (m.aspect as never) : "square",
          cover: Boolean(m.cover),
        });
      } else errors.push(r.error);
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  const professional = await repository.create({
    name,
    city: city as never,
    type: type as never,
    specialties: specialties as never,
    whatsapp: whatsapp.length <= 11 ? `55${whatsapp}` : whatsapp,
    email: loginEmail,
    bio,
    profilePhotoUrl,
    portfolio,
    cpf,
    gender: gender as never,
    birthDate: birthDate || null,
    documentType: documentType as never,
    documentPhotoUrl,
  });

  const account = await accountRepository.create({
    role: "profissional",
    email: loginEmail,
    passwordHash: hashPassword(password),
    professionalId: professional.id,
  });
  const token = await createSession(account.id);

  const res = NextResponse.json(toPublicProfessional(professional), { status: 201 });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
