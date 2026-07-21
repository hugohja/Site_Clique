import { repository } from "@/lib/data";
import {
  MAX_PORTFOLIO_PHOTOS,
  MAX_SPECIALTIES,
  MIN_PORTFOLIO_PHOTOS,
  cleanEventLabel,
  isValidCity,
  type Professional,
} from "@/lib/types";
import { isImageFile } from "@/lib/upload";
import { storeImage } from "@/lib/storage";
import { hasContactInfo } from "@/lib/moderation";

export type ProUpdateResult =
  | { ok: true; professional: Professional }
  | { ok: false; error: string };

/**
 * Aplica a edição do perfil de um profissional a partir de um FormData.
 * Compartilhado pela edição do próprio profissional e pela edição do admin —
 * a checagem de quem pode editar é feita em cada rota (dono x admin).
 *
 * Regra anti-desintermediação: a bio NÃO pode conter telefone, e-mail, @,
 * link ou nome de rede social — senão o profissional publicaria contato no
 * perfil e fecharia por fora. Aqui bloqueamos (não censuramos) pra ele corrigir.
 */
export async function applyProfessionalUpdate(
  proId: string,
  form: FormData
): Promise<ProUpdateResult> {
  const existing = await repository.getById(proId);
  if (!existing) return { ok: false, error: "Perfil não encontrado." };

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
  if (bio && hasContactInfo(bio)) {
    errors.push(
      "A bio não pode conter telefone, e-mail, @, link ou rede social. O contato é feito pela plataforma."
    );
  }

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

  if (errors.length > 0) return { ok: false, error: errors.join(" ") };

  await repository.update(proId, { name, city, bio, specialties, profilePhotoUrl });
  const updated = await repository.replacePortfolio(proId, portfolio);
  return { ok: true, professional: updated ?? existing };
}
