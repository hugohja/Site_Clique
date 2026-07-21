import Link from "next/link";
import { notFound } from "next/navigation";
import { accountRepository, repository } from "@/lib/data";
import { currentAccount } from "@/lib/auth";
import { isAdminAccount } from "@/lib/admin";
import ProfileEditor from "@/components/ProfileEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar profissional — admin" };

export default async function AdminEditProPage({ params }: { params: Promise<{ id: string }> }) {
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
  const pro = await repository.getById(id);
  if (!pro) notFound();

  return (
    <div className="container admin" style={{ paddingBlock: "2rem" }}>
      <nav className="breadcrumb mono">
        <Link href="/admin">← painel</Link>
      </nav>
      <div className="admin-head">
        <h1>Editar {pro.name}</h1>
        <span className="mono admin-count">admin</span>
      </div>
      <p className="admin-lead">
        Edição do perfil público como admin. As mesmas regras valem — a bio não pode conter
        contato nem redes sociais.
      </p>
      <ProfileEditor professionalId={pro.id} endpoint={`/api/admin/professional/${pro.id}`} />
    </div>
  );
}
