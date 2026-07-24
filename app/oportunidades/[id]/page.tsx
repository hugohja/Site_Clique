import Link from "next/link";
import { accountRepository } from "@/lib/data";
import { currentAccount } from "@/lib/auth";
import { buildOpportunityView } from "@/lib/opportunityView";
import VagaDetail from "@/components/VagaDetail";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vaga de evento" };

export default async function VagaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await currentAccount((aid) => accountRepository.getById(aid));
  const view = await buildOpportunityView(id, account);

  return (
    <div className="container" style={{ paddingBlock: "2rem" }}>
      <nav className="breadcrumb mono">
        <Link href="/oportunidades">← vagas</Link>
      </nav>
      {view ? (
        <VagaDetail id={id} initial={view} />
      ) : (
        <div className="empty-state" style={{ marginTop: "1.5rem" }}>
          <span className="mono">404_VAGA</span>
          Vaga não encontrada.{" "}
          <Link href="/oportunidades" style={{ textDecoration: "underline" }}>
            ver vagas
          </Link>
        </div>
      )}
    </div>
  );
}
