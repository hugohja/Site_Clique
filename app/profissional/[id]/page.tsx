import Link from "next/link";
import { notFound } from "next/navigation";
import { repository } from "@/lib/data";
import { formatPrice, formatRating, typeLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pro = await repository.getById(id);
  if (!pro) notFound();

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
              </div>
            </div>
            {/* Contato direto nunca aparece aqui — só via chat com pagamento confirmado. */}
            <Link href={`/profissional/${pro.id}/conversar`} className="btn-contact">
              Iniciar conversa
            </Link>
          </div>
          <div className="stats-strip mono">
            <span>
              <span className="label">a partir de</span>
              {formatPrice(pro.priceFrom)}
            </span>
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
          <div className="portfolio-grid">
            {pro.portfolio.map((item) => (
              <div key={item.id} className={`shot ${item.aspect} tone-${item.tone}`}>
                {item.url && (
                  // eslint-disable-next-line @next/next/no-img-element -- data URL local
                  <img src={item.url} alt="" className="shot-img" />
                )}
                <span className="mono">{item.label}</span>
              </div>
            ))}
          </div>
          {pro.portfolio.every((item) => !item.url) && (
            <p className="portfolio-note">
              Este perfil ainda não enviou fotos — os tiles são placeholders do protótipo.
            </p>
          )}
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
