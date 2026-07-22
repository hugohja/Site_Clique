import { NextRequest, NextResponse } from "next/server";
import { accountRepository } from "@/lib/data";
import { hashPassword } from "@/lib/auth";
import { consumePasswordReset } from "@/lib/passwordReset";
import { isStrongPassword } from "@/lib/password";

/**
 * Redefine a senha a partir de um token válido (uso único, 1h). O token é
 * consumido na validação; a nova senha precisa ser forte, como no cadastro.
 */
export async function POST(request: NextRequest) {
  let body: { token?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const token = String(body.token ?? "");
  const password = String(body.password ?? "");

  if (!isStrongPassword(password)) {
    return NextResponse.json(
      { error: "A senha precisa ser forte: 8+ caracteres com letra, número e caractere especial." },
      { status: 400 }
    );
  }

  const accountId = await consumePasswordReset(token);
  if (!accountId) {
    return NextResponse.json(
      { error: "Link inválido ou expirado. Peça um novo link de redefinição." },
      { status: 400 }
    );
  }

  await accountRepository.updatePassword(accountId, hashPassword(password));
  return NextResponse.json({ ok: true });
}
