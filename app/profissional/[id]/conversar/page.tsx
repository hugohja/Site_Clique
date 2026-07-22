import Link from "next/link";
import { notFound } from "next/navigation";
import NovaConversaForm from "@/components/NovaConversaForm";
import { accountRepository, repository } from "@/lib/data";
import { currentAccount } from "@/lib/auth";
import { typeLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Iniciar conversa — Clique",
};

export default async function ConversarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pro = await repository.getById(id);
  if (!pro) notFound();

  const account = await currentAccount((accId) => accountRepository.getById(accId));
  const isOwner = account?.role === "profissional" && account.professionalId === pro.id;
  // Só cliente contrata. O dono do perfil (e qualquer profissional) não inicia conversa.
  if (isOwner || account?.role === "profissional") {
    return (
      <div className="container form-page">
        <nav className="breadcrumb mono">
          <Link href={`/profissional/${pro.id}`}>← perfil</Link>
        </nav>
        <div className="empty-state" style={{ marginTop: "1.5rem" }}>
          <span className="mono">{isOwner ? "ESTE_E_SEU_PERFIL" : "CONTA_PROFISSIONAL"}</span>
          {isOwner
            ? "Este é o seu perfil — você não inicia conversa consigo mesmo."
            : "Contas profissionais não contratam. Para contratar, entre com uma conta de cliente."}{" "}
          {isOwner && (
            <Link href="/configuracoes" style={{ textDecoration: "underline" }}>
              ir para configurações
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container form-page">
      <nav className="breadcrumb mono">
        <Link href={`/profissional/${pro.id}`}>← perfil</Link>
      </nav>
      <h1 style={{ marginTop: "0.8rem" }}>
        Conversar com {pro.name}
      </h1>
      <p>
        <span className="pro-type mono">{typeLabel(pro.type)}</span> {pro.city}. Conte o básico do
        seu evento e mande a primeira mensagem. A conversa acontece aqui no Clique — o contato
        direto é liberado depois da confirmação do pagamento.
      </p>
      <NovaConversaForm professionalId={pro.id} />
    </div>
  );
}
