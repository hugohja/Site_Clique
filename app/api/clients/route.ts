import { NextRequest, NextResponse } from "next/server";
import { clientRepository } from "@/lib/data";
import { CITIES, DOCUMENT_TYPES, GENDERS, toPublicClient } from "@/lib/types";
import { imageToDataUrl, isImageFile } from "@/lib/upload";

/** Cadastro de cliente (quem contrata). Mesma verificação de identidade dos profissionais. */
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
  const email = String(form.get("email") ?? "").trim();
  const whatsapp = String(form.get("whatsapp") ?? "").replace(/\D/g, "");
  const cpf = String(form.get("cpf") ?? "").replace(/\D/g, "");
  const gender = String(form.get("gender") ?? "");
  const birthDate = String(form.get("birthDate") ?? "").trim();
  const documentType = String(form.get("documentType") ?? "");

  if (name.length < 2) errors.push("Informe o nome.");
  if (city && !CITIES.includes(city as never)) errors.push("Cidade inválida.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push("E-mail inválido.");
  if (whatsapp.length < 10 || whatsapp.length > 15) errors.push("WhatsApp inválido (use DDD + número).");
  if (cpf.length !== 11) errors.push("CPF incompleto (use o formato 000.000.000-00).");
  if (!GENDERS.some((g) => g.value === gender)) errors.push("Selecione o gênero.");
  if (!DOCUMENT_TYPES.some((d) => d.value === documentType))
    errors.push("Selecione o tipo de documento.");

  // Foto de perfil — OBRIGATÓRIA.
  let profilePhotoUrl = "";
  const profilePhoto = form.get("profilePhoto");
  if (!isImageFile(profilePhoto)) {
    errors.push("A foto de perfil é obrigatória.");
  } else {
    const r = await imageToDataUrl(profilePhoto);
    if ("url" in r) profilePhotoUrl = r.url;
    else errors.push(r.error);
  }

  // Documento com foto — OBRIGATÓRIO (nunca exibido publicamente).
  let documentPhotoUrl = "";
  const documentPhoto = form.get("documentPhoto");
  if (!isImageFile(documentPhoto)) {
    errors.push("Anexe a foto do documento (RG, CNH ou passaporte).");
  } else {
    const r = await imageToDataUrl(documentPhoto);
    if ("url" in r) documentPhotoUrl = r.url;
    else errors.push(r.error);
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  const client = await clientRepository.create({
    name,
    city: (city || null) as never,
    whatsapp: whatsapp.length <= 11 ? `55${whatsapp}` : whatsapp,
    email,
    profilePhotoUrl,
    cpf,
    gender: gender as never,
    birthDate: birthDate || null,
    documentType: documentType as never,
    documentPhotoUrl,
  });

  // Devolve o id (guardado no cliente como "usuário atual") + versão pública.
  return NextResponse.json({ id: client.id, client: toPublicClient(client) }, { status: 201 });
}
