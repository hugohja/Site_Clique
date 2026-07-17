import { NextRequest, NextResponse } from "next/server";
import { accountRepository } from "@/lib/data";
import { currentAccount } from "@/lib/auth";

/** Altera o e-mail de login da conta autenticada. */
export async function PATCH(request: NextRequest) {
  const account = await currentAccount((id) => accountRepository.getById(id));
  if (!account) return NextResponse.json({ error: "Faça login." }, { status: 401 });

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
  }
  const other = await accountRepository.getByEmail(email);
  if (other && other.id !== account.id) {
    return NextResponse.json({ error: "Já existe uma conta com esse e-mail." }, { status: 409 });
  }

  await accountRepository.updateEmail(account.id, email);
  return NextResponse.json({ email });
}
