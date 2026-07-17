import Link from "next/link";
import { notFound } from "next/navigation";
import NovaConversaForm from "@/components/NovaConversaForm";
import { repository } from "@/lib/data";
import { typeLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Iniciar conversa — Clica",
};

export default async function ConversarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pro = await repository.getById(id);
  if (!pro) notFound();

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
        seu evento e mande a primeira mensagem. A conversa acontece aqui no Clica — o contato
        direto é liberado depois da confirmação do pagamento.
      </p>
      <NovaConversaForm professionalId={pro.id} />
    </div>
  );
}
