import Link from "next/link";
import VagaDetail from "@/components/VagaDetail";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vaga de evento" };

export default async function VagaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="container" style={{ paddingBlock: "2rem" }}>
      <nav className="breadcrumb mono">
        <Link href="/oportunidades">← vagas</Link>
      </nav>
      <VagaDetail id={id} />
    </div>
  );
}
