import { NextRequest, NextResponse } from "next/server";
import { accountRepository } from "@/lib/data";
import { currentAccount, hashPassword, verifyPassword } from "@/lib/auth";

/** Altera a senha da conta autenticada (exige a senha atual). */
export async function PATCH(request: NextRequest) {
  const account = await currentAccount((id) => accountRepository.getById(id));
  if (!account) return NextResponse.json({ error: "Faça login." }, { status: 401 });

  let body: { current?: string; next?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const current = String(body.current ?? "");
  const next = String(body.next ?? "");
  if (!verifyPassword(current, account.passwordHash)) {
    return NextResponse.json({ error: "Senha atual incorreta." }, { status: 403 });
  }
  if (next.length < 6) {
    return NextResponse.json({ error: "A nova senha precisa ter ao menos 6 caracteres." }, { status: 400 });
  }

  await accountRepository.updatePassword(account.id, hashPassword(next));
  return NextResponse.json({ ok: true });
}
