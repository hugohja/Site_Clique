import Link from "next/link";
import { accountRepository, opportunityRepository } from "@/lib/data";
import { currentAccount } from "@/lib/auth";
import { formatBRL } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Vagas de evento",
  description:
    "Empresas anunciam eventos e os profissionais do Clique se candidatam. Encontre trabalho ou monte sua equipe.",
};

function faixa(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return `${formatBRL(min)}–${formatBRL(max)}`;
  if (min != null) return `a partir de ${formatBRL(min)}`;
  if (max != null) return `até ${formatBRL(max)}`;
  return null;
}

export default async function OportunidadesPage() {
  const account = await currentAccount((id) => accountRepository.getById(id));
  const isClient = account?.role === "cliente";
  const opps = await opportunityRepository.listOpen();
  const myOpps =
    isClient && account?.clientId ? await opportunityRepository.listForClient(account.clientId) : [];

  return (
    <div className="container" style={{ paddingBlock: "2rem" }}>
      <div className="opps-head">
        <div>
          <h1>Vagas de evento</h1>
          <p className="admin-lead" style={{ margin: 0 }}>
            Empresas anunciam eventos e os profissionais do Clique se candidatam. Ao escolher um
            candidato, o combinado fecha com pagamento em custódia — seguro pros dois lados.
          </p>
        </div>
        {isClient && (
          <Link href="/oportunidades/nova" className="btn btn-coral">
            Publicar vaga
          </Link>
        )}
      </div>

      {myOpps.length > 0 && (
        <section style={{ marginTop: "1.6rem" }}>
          <h2 className="section-title">Suas vagas</h2>
          <div className="opps-grid">
            {myOpps.map((o) => (
              <Link key={o.id} href={`/oportunidades/${o.id}`} className="opp-card">
                <div className="opp-card-top">
                  <span className="opp-type mono">{o.eventType}</span>
                  <span className={`status-badge mono status-${o.status === "aberta" ? "contato_liberado" : "reembolsado"}`}>
                    {o.status === "aberta" ? "aberta" : "encerrada"}
                  </span>
                </div>
                <span className="opp-when mono">
                  {o.eventDate}
                  {o.eventTime ? ` · ${o.eventTime}` : ""} · {o.eventLocation}
                </span>
                <p className="opp-desc">{o.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <h2 className="section-title" style={{ marginTop: "1.6rem" }}>
        {isClient ? "Todas as vagas abertas" : "Vagas abertas"}
      </h2>
      {opps.length === 0 ? (
        <div className="empty-state">
          <span className="mono">SEM_VAGAS</span>
          Ainda não há vagas abertas.{" "}
          {isClient ? (
            <Link href="/oportunidades/nova" style={{ textDecoration: "underline" }}>
              Publique a primeira
            </Link>
          ) : (
            "Volte em breve — novas vagas aparecem aqui."
          )}
        </div>
      ) : (
        <div className="opps-grid">
          {opps.map((o) => {
            const range = faixa(o.budgetMin, o.budgetMax);
            return (
              <Link key={o.id} href={`/oportunidades/${o.id}`} className="opp-card">
                <div className="opp-card-top">
                  <span className="opp-type mono">{o.eventType}</span>
                  {o.slots > 1 && <span className="opp-slots mono">{o.slots} vagas</span>}
                </div>
                <span className="opp-when mono">
                  {o.eventDate}
                  {o.eventTime ? ` · ${o.eventTime}` : ""} · {o.eventLocation}
                </span>
                <p className="opp-desc">{o.description}</p>
                <div className="opp-card-foot">
                  <span className="opp-by mono">por {o.clientName}</span>
                  {range && <span className="opp-budget mono">{range}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {account?.role === "profissional" && (
        <p className="admin-lead" style={{ marginTop: "1.4rem", fontSize: "0.85rem" }}>
          Clique numa vaga para se candidatar.
        </p>
      )}
      {!account && (
        <p className="admin-lead" style={{ marginTop: "1.4rem", fontSize: "0.85rem" }}>
          <Link href="/entrar" style={{ textDecoration: "underline" }}>
            Entre
          </Link>{" "}
          como profissional para se candidatar, ou como cliente/empresa para publicar uma vaga.
        </p>
      )}
    </div>
  );
}
