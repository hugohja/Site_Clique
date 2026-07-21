import Link from "next/link";
import { notFound } from "next/navigation";
import { accountRepository, repository } from "@/lib/data";
import { currentAccount } from "@/lib/auth";
import { formatRating, typeLabel } from "@/lib/format";
import { verificationLabel } from "@/lib/types";
import PortfolioGallery from "@/components/PortfolioGallery";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pro = await repository.getById(id);
  if (!pro) notFound();

  const account = await currentAccount((accId) => accountRepository.getById(accId));
  const isOwner = account?.role === "profissional" && account.professionalId === pro.id;
  // Capa primeiro, resto na ordem salva.
  const portfolio = [...pro.portfolio].sort((a, b) => Number(b.cover) - Number(a.cover));

  return (
    <>
      <section className="profile-head">
        <div className="container">
          <nav className="breadcrumb mono">
            <Link href="/">← busca</Link>
          </nav>
          <div className="profile-title-row">
            <div className="profile-identity">
              {pro.profilePhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URL local, sem otimização
                <img className="avatar" src={pro.profilePhotoUrl} alt={`Foto de ${pro.name}`} />
              ) : (
                <span className="avatar avatar-placeholder mono" aria-hidden>
                  {pro.name.charAt(0)}
                </span>
              )}
              <div>
                <h1>{pro.name}</h1>
                <p className="profile-sub">
                  <span className="pro-type mono">{typeLabel(pro.type)}</span>
                  {pro.city}
                </p>
                <span className={`verify-badge mono verify-${pro.identity.status}`}>
                  {pro.identity.status === "verificado" ? "✓ " : "⏳ "}
                  {verificationLabel(pro.identity.status)}
                </span>
              </div>
            </div>
            {/* Contato direto nunca aparece aqui — só via chat com pagamento confirmado. */}
            {isOwner ? (
              <Link href="/configuracoes" className="btn-contact">
                Configurações
              </Link>
            ) : (
              <Link href={`/profissional/${pro.id}/conversar`} className="btn-contact">
                Iniciar conversa
              </Link>
            )}
          </div>
          <div className="stats-strip mono">
            <span>
              <span className="label">nota</span>
              {formatRating(pro)}
            </span>
            <span>
              <span className="label">avaliações</span>
              {pro.reviewCount}
            </span>
            <span>
              <span className="label">resposta</span>
              {pro.responseTimeHours !== null ? `${pro.responseTimeHours}h` : "—"}
            </span>
          </div>
        </div>
      </section>

      <section className="profile-body container">
        <div>
          <h2 className="section-title">Portfólio</h2>
          <PortfolioGallery
            items={portfolio.map((item) => ({
              id: item.id,
              url: item.url,
              label: item.label,
              cover: item.cover,
            }))}
          />
        </div>
        <aside className="profile-aside">
          <h2 className="section-title">Especialidades</h2>
          <div className="tag-row">
            {pro.specialties.map((s) => (
              <span key={s} className="tag">
                {s}
              </span>
            ))}
          </div>
          <h2 className="section-title">Sobre</h2>
          <p className="bio">{pro.bio}</p>
        </aside>
      </section>
    </>
  );
}
