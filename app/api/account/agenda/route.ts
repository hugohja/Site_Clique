import { NextRequest, NextResponse } from "next/server";
import { accountRepository, repository } from "@/lib/data";
import { currentAccount } from "@/lib/auth";
import { cleanUnavailableDates, todayInBrazil } from "@/lib/types";

/** Lê a agenda (datas indisponíveis) do profissional logado. */
export async function GET() {
  const account = await currentAccount((id) => accountRepository.getById(id));
  if (!account || account.role !== "profissional" || !account.professionalId) {
    return NextResponse.json({ error: "Entre com sua conta profissional." }, { status: 401 });
  }
  const pro = await repository.getById(account.professionalId);
  // Descarta datas que já passaram na leitura também.
  const dates = cleanUnavailableDates(pro?.unavailableDates ?? [], todayInBrazil());
  return NextResponse.json({ unavailableDates: dates });
}

/** Define/atualiza a agenda (datas indisponíveis) do profissional logado. */
export async function PUT(request: NextRequest) {
  const account = await currentAccount((id) => accountRepository.getById(id));
  if (!account || account.role !== "profissional" || !account.professionalId) {
    return NextResponse.json({ error: "Entre com sua conta profissional." }, { status: 401 });
  }
  let body: { unavailableDates?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const dates = cleanUnavailableDates(body.unavailableDates, todayInBrazil());
  const updated = await repository.setUnavailableDates(account.professionalId, dates);
  return NextResponse.json({ unavailableDates: updated?.unavailableDates ?? dates });
}
