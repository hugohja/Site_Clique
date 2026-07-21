import { NextRequest, NextResponse } from "next/server";
import { accountRepository, clientRepository } from "@/lib/data";
import { currentAccount } from "@/lib/auth";
import { isAdminAccount } from "@/lib/admin";
import { isValidCity, toPublicClient } from "@/lib/types";
import { isImageFile } from "@/lib/upload";
import { storeImage } from "@/lib/storage";

/** Admin edita o perfil de QUALQUER cliente: nome, cidade e foto. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const account = await currentAccount((id) => accountRepository.getById(id));
  if (!isAdminAccount(account)) {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }
  const { id } = await params;
  const existing = await clientRepository.getById(id);
  if (!existing) {
    return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Envie o formulário completo." }, { status: 400 });
  }

  const errors: string[] = [];
  const name = String(form.get("name") ?? "").trim();
  const city = String(form.get("city") ?? "").trim();

  if (name.length < 2) errors.push("Informe o nome.");
  // Cidade é opcional para clientes, mas se vier precisa ser válida.
  if (city && !isValidCity(city)) errors.push("Escolha uma cidade válida (Nome – UF).");

  let profilePhotoUrl: string | undefined;
  const profilePhoto = form.get("profilePhoto");
  if (isImageFile(profilePhoto)) {
    const r = await storeImage(profilePhoto, "profile");
    if ("url" in r) profilePhotoUrl = r.url;
    else errors.push(r.error);
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  const updated = await clientRepository.update(id, {
    name,
    city: city || null,
    profilePhotoUrl,
  });
  return NextResponse.json(updated ? toPublicClient(updated) : {}, { status: 200 });
}
