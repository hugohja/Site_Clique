import { NextRequest, NextResponse } from "next/server";
import { accountRepository } from "@/lib/data";
import { currentAccount } from "@/lib/auth";
import { isAdminAccount } from "@/lib/admin";
import { toPublicProfessional } from "@/lib/types";
import { applyProfessionalUpdate } from "@/lib/proProfileUpdate";

/** Admin edita o perfil de QUALQUER profissional (mesma lógica da edição do dono). */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const account = await currentAccount((id) => accountRepository.getById(id));
  if (!isAdminAccount(account)) {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }
  const { id } = await params;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Envie o formulário completo." }, { status: 400 });
  }

  const result = await applyProfessionalUpdate(id, form);
  if (!result.ok) {
    const status = result.error === "Perfil não encontrado." ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json(toPublicProfessional(result.professional), { status: 200 });
}
