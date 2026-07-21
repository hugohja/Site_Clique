import Link from "next/link";
import { accountRepository, conversationRepository, repository } from "@/lib/data";
import { currentAccount } from "@/lib/auth";
import { commissionAmount, payoutAmount, PAID_STATUSES, type Conversation } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Carteira — Clique" };

function brl(value: number) {
  return `R$ ${value.toLocaleString("pt-BR")}`;
}

const STATUS_LABEL: Partial<Record<Conversation["status"], string>> = {
  contato_liberado: "em custódia",
  concluido: "recebido",
  em_disputa: "em disputa",
  reembolsado: "reembolsado",
};

export default async function CarteiraPage() {
  const account = await currentAccount((id) => accountRepository.getById(id));
  if (!account || account.role !== "profissional" || !account.professionalId) {
    return (
      <div className="container" style={{ paddingBlock: "4rem" }}>
        <div className="empty-state">
          <span className="mono">CARTEIRA_PRO</span>
          A carteira é da conta profissional. Entre como profissional para ver seus recebimentos.
        </div>
      </div>
    );
  }

  const pro = await repository.getById(account.professionalId);
  const convs = await conversationRepository.listForProfessional(account.professionalId);
  const paid = convs
    .filter((c) => PAID_STATUSES.includes(c.status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  let emCustodia = 0; // pago, ainda não liberado (contato_liberado + em_disputa)
  let aReceber = 0; // concluído, aguardando o repasse (PIX) da Clique
  let recebido = 0; // repasse já feito pela Clique
  let comissaoTotal = 0;
  for (const c of paid) {
    const price = c.agreedPrice ?? 0;
    if (c.status === "contato_liberado" || c.status === "em_disputa") {
      emCustodia += price;
    } else if (c.status === "concluido") {
      const payout = payoutAmount(price, c.commissionRate);
      comissaoTotal += commissionAmount(price, c.commissionRate);
      if (c.paidOutAt) recebido += payout;
      else aReceber += payout;
    }
  }

  return (
    <div className="container carteira" style={{ paddingBlock: "2rem" }}>
      <div className="admin-head">
        <h1>Carteira</h1>
        <span className="mono admin-count">{pro?.name}</span>
      </div>
      <p className="admin-lead">
        O pagamento fica em custódia da Clique e é liberado quando você valida o código do cliente no
        evento. A comissão da plataforma já sai do valor liberado.
      </p>

      <div className="wallet-cards wallet-cards-3">
        <div className="wallet-card custody">
          <span className="wallet-label mono">em custódia</span>
          <strong className="wallet-value">{brl(emCustodia)}</strong>
          <span className="wallet-note mono">liberado ao validar o código no evento</span>
        </div>
        <div className="wallet-card pending">
          <span className="wallet-label mono">a receber</span>
          <strong className="wallet-value">{brl(aReceber)}</strong>
          <span className="wallet-note mono">concluído — repasse PIX a caminho</span>
        </div>
        <div className="wallet-card released">
          <span className="wallet-label mono">já recebido</span>
          <strong className="wallet-value">{brl(recebido)}</strong>
          <span className="wallet-note mono">comissão Clique: {brl(comissaoTotal)}</span>
        </div>
      </div>

      <h2 className="section-title" style={{ marginTop: "1.6rem" }}>
        Histórico
      </h2>
      {paid.length === 0 ? (
        <div className="empty-state">
          <span className="mono">SEM_MOVIMENTACOES</span>
          Nenhum pagamento ainda. Quando um cliente pagar uma proposta, aparece aqui.
        </div>
      ) : (
        <div className="wallet-list">
          {paid.map((c) => {
            const price = c.agreedPrice ?? 0;
            const payout = payoutAmount(price, c.commissionRate);
            return (
              <Link key={c.id} href={`/conversa/${c.id}`} className="wallet-row">
                <div className="wallet-row-info">
                  <strong>{c.clientName}</strong>
                  <span className="admin-meta mono">
                    {c.eventType} · {c.eventDate}
                  </span>
                </div>
                <div className="wallet-row-money">
                  <span className={`status-badge mono status-${c.status}`}>
                    {c.status === "concluido" && !c.paidOutAt
                      ? "a receber"
                      : STATUS_LABEL[c.status] ?? c.status}
                  </span>
                  <span className="mono">
                    {c.status === "concluido" ? (
                      c.paidOutAt ? <>recebeu {brl(payout)}</> : <>a receber {brl(payout)}</>
                    ) : c.status === "reembolsado" ? (
                      <>reembolsado {brl(price)}</>
                    ) : (
                      <>{brl(price)}</>
                    )}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
