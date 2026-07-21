import Link from "next/link";
import { notFound } from "next/navigation";
import { accountRepository, clientRepository } from "@/lib/data";
import { currentAccount } from "@/lib/auth";
import { isAdminAccount } from "@/lib/admin";
import ClientEditor from "@/components/ClientEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar cliente — admin" };

export default async function AdminEditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const account = await currentAccount((id) => accountRepository.getById(id));
  if (!isAdminAccount(account)) {
    return (
      <div className="container" style={{ paddingBlock: "4rem" }}>
        <div className="empty-state">
          <span className="mono">403_ADMIN</span>
          Acesso restrito.
        </div>
      </div>
    );
  }

  const { id } = await params;
  const client = await clientRepository.getById(id);
  if (!client) notFound();

  return (
    <div className="container admin" style={{ paddingBlock: "2rem" }}>
      <nav className="breadcrumb mono">
        <Link href="/admin">← painel</Link>
      </nav>
      <div className="admin-head">
        <h1>Editar {client.name}</h1>
        <span className="mono admin-count">admin</span>
      </div>
      <ClientEditor
        clientId={client.id}
        initialName={client.name}
        initialCity={client.city ?? ""}
        initialPhoto={client.profilePhotoUrl}
      />
    </div>
  );
}
