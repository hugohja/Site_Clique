import { NextResponse } from "next/server";
import { accountRepository, clientRepository, repository } from "@/lib/data";
import { currentAccount } from "@/lib/auth";
import { isAdminAccount } from "@/lib/admin";

/** Quem está logado — usado pelo header e pelas telas que dependem da sessão. */
export async function GET() {
  const account = await currentAccount((id) => accountRepository.getById(id));
  if (!account) {
    return NextResponse.json({ account: null });
  }

  const profile =
    account.role === "profissional"
      ? await repository.getById(account.professionalId ?? "")
      : await clientRepository.getById(account.clientId ?? "");

  return NextResponse.json({
    account: {
      id: account.id,
      role: account.role,
      email: account.email,
      professionalId: account.professionalId,
      clientId: account.clientId,
      isAdmin: isAdminAccount(account),
    },
    profile: profile
      ? {
          id: profile.id,
          name: profile.name,
          profilePhotoUrl: profile.profilePhotoUrl,
          verificationStatus: profile.identity.status,
        }
      : null,
  });
}
