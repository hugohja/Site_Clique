import Link from "next/link";
import { accountRepository, clientRepository, conversationRepository, repository } from "@/lib/data";
import { currentAccount } from "@/lib/auth";
import { isAdminAccount } from "@/lib/admin";
import { formatBRL, maskCpf, typeLabel } from "@/lib/format";
import { DOCUMENT_TYPES, payoutAmount } from "@/lib/types";
import { DOCUMENTS_BUCKET, isSupabaseConfigured, sbSignedUrl } from "@/lib/supabase";
import AdminActions from "@/components/AdminActions";
import AdminDisputeActions from "@/components/AdminDisputeActions";
import AdminPayoutActions from "@/components/AdminPayoutActions";
import AdminPaymentActions from "@/components/AdminPaymentActions";
import AdminBrowse from "@/components/AdminBrowse";

export const dynamic = "force-dynamic";
export const metadata = { title: "Painel admin — Clique" };

/** Resolve a imagem do documento: data URL direta, ou URL assinada do bucket privado. */
async function docSrc(raw: string): Promise<string | null> {
  if (!raw) return null;
  if (raw.startsWith("data:") || raw.startsWith("http")) return raw;
  if (isSupabaseConfigured()) return sbSignedUrl(DOCUMENTS_BUCKET, raw, 300);
  return raw;
}

const docLabel = (v: string) => DOCUMENT_TYPES.find((d) => d.value === v)?.label ?? v;
const dateFmt = (iso: string) => new Date(iso).toLocaleString("pt-BR");

export default async function AdminPage() {
  const account = await currentAccount((id) => accountRepository.getById(id));
  if (!isAdminAccount(account)) {
    return (
      <div className="container" style={{ paddingBlock: "4rem" }}>
        <div className="empty-state">
          <span className="mono">403_ADMIN</span>
          Acesso restrito ao painel de moderação.
        </div>
      </div>
    );
  }

  const [pros, clis, disputes, pendingPayments, payouts, allPros, allClis] = await Promise.all([
    repository.listByStatus("em_analise"),
    clientRepository.listByStatus("em_analise"),
    conversationRepository.listDisputes(),
    conversationRepository.listPendingPaymentConfirmations(),
    conversationRepository.listPendingPayouts(),
    repository.list(),
    clientRepository.list(),
  ]);
  const proDocs = await Promise.all(pros.map((p) => docSrc(p.identity.documentPhotoUrl)));
  const cliDocs = await Promise.all(clis.map((c) => docSrc(c.identity.documentPhotoUrl)));
  const disputePros = await Promise.all(disputes.map((d) => repository.getById(d.professionalId)));
  const paymentPros = await Promise.all(pendingPayments.map((p) => repository.getById(p.professionalId)));
  const payoutPros = await Promise.all(payouts.map((p) => repository.getById(p.professionalId)));
  const total = pros.length + clis.length;

  return (
    <div className="container admin">
      <div className="admin-head">
        <h1>Moderação de identidade</h1>
        <span className="mono admin-count">
          {total} pendente{total === 1 ? "" : "s"}
        </span>
      </div>
      <p className="admin-lead">
        Confira o documento com foto e aprove os cadastros válidos. CPF e documento são
        confidenciais — use apenas para verificação.
      </p>

      {pendingPayments.length > 0 && (
        <section className="admin-section">
          <h2 className="section-title">💰 Pagamentos a confirmar ({pendingPayments.length})</h2>
          <p className="admin-lead">
            O cliente informou que fez o PIX. Confira na conta da Clique se o valor caiu e confirme —
            só então o contato é liberado.
          </p>
          <div className="admin-list">
            {pendingPayments.map((p, i) => (
              <article key={p.id} className="admin-card">
                <div className="admin-person">
                  <div>
                    <h3>{p.clientName} → {paymentPros[i]?.name ?? "profissional"}</h3>
                    <p className="admin-meta mono">
                      {p.eventType} · {p.eventDate}{p.eventTime ? ` às ${p.eventTime}` : ""} · {p.eventLocation}
                    </p>
                    {p.proposal?.amount != null && (
                      <p className="admin-meta mono">
                        valor informado: <strong>{formatBRL(p.proposal.amount)}</strong>
                      </p>
                    )}
                  </div>
                </div>
                <AdminPaymentActions conversationId={p.id} />
              </article>
            ))}
          </div>
        </section>
      )}

      {disputes.length > 0 && (
        <section className="admin-section">
          <h2 className="section-title">⚠ Disputas — não comparecimento ({disputes.length})</h2>
          <div className="admin-list">
            {disputes.map((d, i) => (
              <article key={d.id} className="admin-card">
                <div className="admin-person">
                  <div>
                    <h3>{disputePros[i]?.name ?? "profissional"}</h3>
                    <p className="admin-meta mono">
                      cliente: {d.clientName} · {d.eventType} · {d.eventDate}{d.eventTime ? ` às ${d.eventTime}` : ""}
                    </p>
                    <p className="admin-meta mono">local: {d.eventLocation}</p>
                    {d.agreedPrice != null && (
                      <p className="admin-meta mono">
                        valor em custódia: {formatBRL(d.agreedPrice)}
                      </p>
                    )}
                  </div>
                </div>
                <AdminDisputeActions conversationId={d.id} />
              </article>
            ))}
          </div>
        </section>
      )}

      {payouts.length > 0 && (
        <section className="admin-section">
          <h2 className="section-title">💸 Repasses pendentes ({payouts.length})</h2>
          <p className="admin-lead">
            Serviços concluídos aguardando o PIX ao profissional. Envie o valor pra chave abaixo e
            marque como repassado.
          </p>
          <div className="admin-list">
            {payouts.map((p, i) => {
              const pro = payoutPros[i];
              const price = p.agreedPrice ?? 0;
              const payout = payoutAmount(price, p.commissionRate);
              return (
                <article key={p.id} className="admin-card">
                  <div className="admin-person">
                    <div>
                      <h3>{pro?.name ?? "profissional"}</h3>
                      <p className="admin-meta mono">
                        cliente: {p.clientName} · {p.eventType} · {p.eventDate}{p.eventTime ? ` às ${p.eventTime}` : ""}
                      </p>
                      <p className="admin-meta mono">
                        repassar: <strong>{formatBRL(payout)}</strong> (de {formatBRL(price)})
                      </p>
                      <p className="admin-meta mono">
                        chave PIX:{" "}
                        {pro?.payoutPixKey ? (
                          <strong>{pro.payoutPixKey}</strong>
                        ) : (
                          <span className="admin-nodoc">não cadastrada — peça ao profissional</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <AdminPayoutActions conversationId={p.id} />
                </article>
              );
            })}
          </div>
        </section>
      )}

      {total === 0 ? (
        <div className="empty-state">
          <span className="mono">SEM_PENDENCIAS</span>
          Nenhuma identidade em análise no momento.
        </div>
      ) : (
        <>
          {pros.length > 0 && (
            <section className="admin-section">
              <h2 className="section-title">Profissionais ({pros.length})</h2>
              <div className="admin-list">
                {pros.map((p, i) => (
                  <article key={p.id} className="admin-card">
                    <div className="admin-person">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="admin-avatar" src={p.profilePhotoUrl} alt="" />
                      <div>
                        <h3>{p.name}</h3>
                        <p className="admin-meta mono">
                          {typeLabel(p.type)} · {p.city}
                        </p>
                        <p className="admin-meta mono">
                          CPF {maskCpf(p.identity.cpf)} · {docLabel(p.identity.documentType)}
                          {p.identity.birthDate ? ` · nasc. ${p.identity.birthDate}` : ""}
                        </p>
                        <p className="admin-meta mono">enviado em {dateFmt(p.identity.submittedAt)}</p>
                      </div>
                    </div>
                    <div className="admin-doc">
                      {proDocs[i] ? (
                        <a href={proDocs[i]!} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={proDocs[i]!} alt="documento enviado" />
                        </a>
                      ) : (
                        <span className="mono admin-nodoc">documento indisponível</span>
                      )}
                    </div>
                    <div className="admin-card-foot">
                      <Link href={`/admin/profissional/${p.id}`} className="btn btn-sm btn-ghost">
                        Editar perfil
                      </Link>
                      <AdminActions kind="professional" id={p.id} />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {clis.length > 0 && (
            <section className="admin-section">
              <h2 className="section-title">Clientes ({clis.length})</h2>
              <div className="admin-list">
                {clis.map((c, i) => (
                  <article key={c.id} className="admin-card">
                    <div className="admin-person">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="admin-avatar" src={c.profilePhotoUrl} alt="" />
                      <div>
                        <h3>{c.name}</h3>
                        <p className="admin-meta mono">{c.city ?? "—"}</p>
                        <p className="admin-meta mono">
                          CPF {maskCpf(c.identity.cpf)} · {docLabel(c.identity.documentType)}
                          {c.identity.birthDate ? ` · nasc. ${c.identity.birthDate}` : ""}
                        </p>
                        <p className="admin-meta mono">enviado em {dateFmt(c.identity.submittedAt)}</p>
                      </div>
                    </div>
                    <div className="admin-doc">
                      {cliDocs[i] ? (
                        <a href={cliDocs[i]!} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={cliDocs[i]!} alt="documento enviado" />
                        </a>
                      ) : (
                        <span className="mono admin-nodoc">documento indisponível</span>
                      )}
                    </div>
                    <div className="admin-card-foot">
                      <Link href={`/admin/cliente/${c.id}`} className="btn btn-sm btn-ghost">
                        Editar perfil
                      </Link>
                      <AdminActions kind="client" id={c.id} />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <AdminBrowse
        pros={allPros.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          city: p.city,
          status: p.identity.status,
          photo: p.profilePhotoUrl,
        }))}
        clients={allClis.map((c) => ({
          id: c.id,
          name: c.name,
          city: c.city ?? "",
          status: c.identity.status,
          photo: c.profilePhotoUrl,
        }))}
      />
    </div>
  );
}
