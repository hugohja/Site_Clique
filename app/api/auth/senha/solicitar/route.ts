import { NextRequest, NextResponse, after } from "next/server";
import { accountRepository } from "@/lib/data";
import { createPasswordReset } from "@/lib/passwordReset";
import { notifyPasswordReset } from "@/lib/notify";

/**
 * Pede a redefinição de senha: recebe o e-mail e, se existir uma conta, envia
 * um link com token. SEMPRE responde 200 com a mesma mensagem — não revela se
 * o e-mail tem conta (evita enumeração). O link só vai por e-mail.
 */
export async function POST(request: NextRequest) {
  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const email = String(body.email ?? "").trim().toLowerCase();

  const genericOk = NextResponse.json({
    ok: true,
    message: "Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha.",
  });

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return genericOk;

  const account = await accountRepository.getByEmail(email);
  if (!account) return genericOk; // não revela ausência de conta

  const token = await createPasswordReset(account.id);
  const link = `${request.nextUrl.origin}/redefinir-senha?token=${encodeURIComponent(token)}`;
  after(() => notifyPasswordReset(account.email, link));

  return genericOk;
}
