import { NextRequest, NextResponse } from "next/server";
import { accountRepository, repository } from "@/lib/data";
import { currentAccount } from "@/lib/auth";
import {
  MAX_PORTFOLIO_PHOTOS,
  MAX_SPECIALTIES,
  MIN_PORTFOLIO_PHOTOS,
  cleanEventLabel,
  isValidCity,
  toPublicProfessional,
} from "@/lib/types";
import { isImageFile } from "@/lib/upload";
import { storeImage } from "@/lib/storage";

/** Edição do próprio perfil (profissional logado): nome, cidade, bio, especialidades, foto e portfólio. */
export async function PATCH(request: NextRequest) {
  const account = await currentAccount((id) => accountRepository.getById(id));
  if (!account || account.role !== "profissional" || !account.professionalId) {
    return NextResponse.json({ error: "Entre com sua conta profissional." }, { status: 401 });
  }
  const proId = account.professionalId;
  const existing = await repository.getById(proId);
  if (!existing) {
    return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Envie o formulário completo." }, { status: 400 });
  }

  const errors: string[] = [];
  const name = String(form.get("name") ?? "").trim();
  const city = String(form.get("city") ?? "");
  const bio = String(form.get("bio") ?? "").trim();
  const specialties = Array.from(
    new Set(form.getAll("specialties").map((s) => cleanEventLabel(String(s))).filter(Boolean))
  ).slice(0, MAX_SPECIALTIES);

  if (name.length < 2) errors.push("Informe o nome.");
  if (!isValidCity(city)) errors.push("Escolha uma cidade válida (Nome – UF).");
  if (specialties.length === 0) errors.push("Escolha ou escreva ao menos uma especialidade.");
  if (bio.length < 10) errors.push("Escreva uma bio de pelo menos 10 caracteres.");

  // Foto de perfil: só troca se enviou uma nova.
  let profilePhotoUrl: string | undefined;
  const profilePhoto = form.get("profilePhoto");
  if (isImageFile(profilePhoto)) {
    const r = await storeImage(profilePhoto, "profile");
    if ("url" in r) profilePhotoUrl = r.url;
    else errors.push(r.error);
  }

  // Portfólio: meta na ordem final; cada item é existente (url) ou nova (newIndex).
  let meta: { url?: string; newIndex?: number; focus?: string; cover?: boolean }[] = [];
  try {
    meta = JSON.parse(String(form.get("portfolioMeta") ?? "[]"));
  } catch {
    meta = [];
  }
  const newFiles = form.getAll("portfolioNewPhotos").filter(isImageFile);

  const portfolio: { url: string; focus: string; cover: boolean }[] = [];
  for (const m of meta) {
    let url: string | null = null;
    if (typeof m.url === "string" && m.url) {
      url = m.url;
    } else if (typeof m.newIndex === "number" && newFiles[m.newIndex]) {
      const r = await storeImage(newFiles[m.newIndex], "portfolio");
      if ("url" in r) url = r.url;
      else errors.push(r.error);
    }
    if (url) {
      portfolio.push({
        url,
        focus: typeof m.focus === "string" ? m.focus : "50% 50%",
        cover: Boolean(m.cover),
      });
    }
  }

  if (portfolio.length < MIN_PORTFOLIO_PHOTOS) {
    errors.push(`O portfólio precisa de ao menos ${MIN_PORTFOLIO_PHOTOS} fotos.`);
  } else if (portfolio.length > MAX_PORTFOLIO_PHOTOS) {
    errors.push(`No máximo ${MAX_PORTFOLIO_PHOTOS} fotos de portfólio.`);
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  await repository.update(proId, { name, city, bio, specialties, profilePhotoUrl });
  const updated = await repository.replacePortfolio(proId, portfolio);

  return NextResponse.json(updated ? toPublicProfessional(updated) : {}, { status: 200 });
}
