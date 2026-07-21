import { accountRepository, clientRepository, repository } from "@/lib/data";
import { currentAccount } from "@/lib/auth";
import { isAdminAccount } from "@/lib/admin";
import { maskCpf, typeLabel } from "@/lib/format";
import { DOCUMENT_TYPES } from "@/lib/types";
import { DOCUMENTS_BUCKET, isSupabaseConfigured, sbSignedUrl } from "@/lib/supabase";
import AdminActions from "@/components/AdminActions";

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

  const [pros, clis] = await Promise.all([
    repository.listByStatus("em_analise"),
    clientRepository.listByStatus("em_analise"),
  ]);
  const proDocs = await Promise.all(pros.map((p) => docSrc(p.identity.documentPhotoUrl)));
  const cliDocs = await Promise.all(clis.map((c) => docSrc(c.identity.documentPhotoUrl)));
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

      {total === 0 ? (
        <div className="empty-state">
          <span className="mono">SEM_PENDENCIAS</span>
          Nada em análise no momento.
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
                    <AdminActions kind="professional" id={p.id} />
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
                    <AdminActions kind="client" id={c.id} />
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
