import { NextRequest, NextResponse } from "next/server";
import { accountRepository, clientRepository, repository } from "@/lib/data";
import { currentAccount } from "@/lib/auth";
import { isAdminAccount } from "@/lib/admin";

/**
 * Ações de moderação de identidade (somente admin):
 *  aprovar → identidade vira "verificado"
 *  recusar → remove o cadastro (perfil, identidade, portfólio) e a conta
 */
export async function POST(request: NextRequest) {
  const account = await currentAccount((id) => accountRepository.getById(id));
  if (!isAdminAccount(account)) {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }

  let body: { kind?: string; id?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { kind, id, action } = body;
  if (
    (kind !== "professional" && kind !== "client") ||
    !id ||
    (action !== "aprovar" && action !== "recusar")
  ) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  if (kind === "professional") {
    if (action === "aprovar") {
      await repository.setVerificationStatus(id, "verificado");
    } else {
      await accountRepository.deleteByProfessionalId(id);
      await repository.remove(id);
    }
  } else {
    if (action === "aprovar") {
      await clientRepository.setVerificationStatus(id, "verificado");
    } else {
      await accountRepository.deleteByClientId(id);
      await clientRepository.remove(id);
    }
  }

  return NextResponse.json({ ok: true });
}
