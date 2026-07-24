import { NextRequest, NextResponse } from "next/server";
import {
  accountRepository,
  applicationRepository,
  opportunityRepository,
  repository,
} from "@/lib/data";
import { censorContactAttempts } from "@/lib/moderation";
import { currentAccount } from "@/lib/auth";

/** Profissional se candidata a uma vaga (uma candidatura por vaga). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await currentAccount((aid) => accountRepository.getById(aid));
  if (!account) {
    return NextResponse.json({ error: "Entre com sua conta para se candidatar." }, { status: 401 });
  }
  if (account.role !== "profissional" || !account.professionalId) {
    return NextResponse.json(
      { error: "Só profissionais se candidatam às vagas." },
      { status: 403 }
    );
  }
  const pro = await repository.getById(account.professionalId);
  if (!pro) return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });

  const opp = await opportunityRepository.getById(id);
  if (!opp) return NextResponse.json({ error: "Vaga não encontrada." }, { status: 404 });
  if (opp.status !== "aberta") {
    return NextResponse.json({ error: "Esta vaga já foi encerrada." }, { status: 409 });
  }

  const existing = await applicationRepository.getByPro(id, pro.id);
  if (existing) {
    return NextResponse.json({ error: "Você já se candidatou a esta vaga." }, { status: 409 });
  }

  let body: { message?: unknown; amount?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const rawMessage = String(body.message ?? "").trim();
  if (rawMessage.length < 5) {
    return NextResponse.json({ error: "Escreva uma mensagem para a empresa." }, { status: 400 });
  }
  const amount = Number(body.amount);
  const proposedAmount = Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : null;

  // Filtra tentativa de contato na mensagem (mesma regra do chat).
  const message = censorContactAttempts(rawMessage).text;

  const app = await applicationRepository.create({
    opportunityId: id,
    professionalId: pro.id,
    professionalName: pro.name,
    message,
    proposedAmount,
  });
  return NextResponse.json({ id: app.id, status: app.status }, { status: 201 });
}
