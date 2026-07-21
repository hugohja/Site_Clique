import { NextRequest, NextResponse } from "next/server";
import { accountRepository, repository } from "@/lib/data";
import { currentAccount } from "@/lib/auth";

/** Lê a chave PIX de repasse do profissional logado (privada — só o dono vê). */
export async function GET() {
  const account = await currentAccount((id) => accountRepository.getById(id));
  if (!account || account.role !== "profissional" || !account.professionalId) {
    return NextResponse.json({ error: "Entre com sua conta profissional." }, { status: 401 });
  }
  const pro = await repository.getById(account.professionalId);
  return NextResponse.json({ payoutPixKey: pro?.payoutPixKey ?? "" });
}

/** Define/atualiza a chave PIX de repasse do profissional logado. */
export async function PATCH(request: NextRequest) {
  const account = await currentAccount((id) => accountRepository.getById(id));
  if (!account || account.role !== "profissional" || !account.professionalId) {
    return NextResponse.json({ error: "Entre com sua conta profissional." }, { status: 401 });
  }
  let body: { payoutPixKey?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const key = String(body.payoutPixKey ?? "").trim();
  if (key.length > 140) {
    return NextResponse.json({ error: "Chave PIX inválida." }, { status: 400 });
  }
  await repository.update(account.professionalId, { payoutPixKey: key || null });
  return NextResponse.json({ payoutPixKey: key });
}
