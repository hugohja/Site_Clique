import Link from "next/link";
import { redirect } from "next/navigation";
import { accountRepository } from "@/lib/data";
import { currentAccount } from "@/lib/auth";
import NovaVagaForm from "@/components/NovaVagaForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Publicar vaga" };

export default async function NovaVagaPage() {
  const account = await currentAccount((id) => accountRepository.getById(id));
  if (!account) redirect("/entrar");
  if (account.role !== "cliente") {
    return (
      <div className="container form-page">
        <div className="empty-state" style={{ marginTop: "1.5rem" }}>
          <span className="mono">CONTA_PROFISSIONAL</span>
          Só contas de cliente/empresa publicam vagas. Contas profissionais se candidatam.{" "}
          <Link href="/oportunidades" style={{ textDecoration: "underline" }}>
            ver vagas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container form-page">
      <nav className="breadcrumb mono">
        <Link href="/oportunidades">← vagas</Link>
      </nav>
      <h1 style={{ marginTop: "0.8rem" }}>Publicar vaga de evento</h1>
      <p>
        Anuncie seu evento e receba candidaturas dos profissionais do Clique. Ao escolher um, vocês
        combinam pelo chat e o pagamento fica em custódia.
      </p>
      <NovaVagaForm />
    </div>
  );
}
