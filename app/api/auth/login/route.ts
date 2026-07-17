import { NextRequest, NextResponse } from "next/server";
import { accountRepository } from "@/lib/data";
import { SESSION_COOKIE, createSession, verifyPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const account = await accountRepository.getByEmail(email);

  // Mensagem genérica pra não revelar se o e-mail existe.
  if (!account || !verifyPassword(password, account.passwordHash)) {
    return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
  }

  const token = createSession(account.id);
  const res = NextResponse.json({
    role: account.role,
    professionalId: account.professionalId,
    clientId: account.clientId,
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
