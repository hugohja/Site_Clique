import Link from "next/link";
import { notFound } from "next/navigation";
import { repository, reviewRepository } from "@/lib/data";
import { formatRating, typeLabel } from "@/lib/format";
import { cleanUnavailableDates, todayInBrazil, verificationLabel } from "@/lib/types";
import PortfolioGallery from "@/components/PortfolioGallery";
import ProfileCTA from "@/components/ProfileCTA";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pro = await repository.getById(id);
  if (!pro) notFound();

  // Capa primeiro, resto na ordem salva.
  const portfolio = [...pro.portfolio].sort((a, b) => Number(b.cover) - Number(a.cover));
  const reviews = await reviewRepository.listByProfessional(pro.id);
  const busyDates = cleanUnavailableDates(pro.unavailableDates ?? [], todayInBrazil());
  const fmtDate = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

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
            {/* Contato direto nunca aparece aqui — só via chat com pagamento confirmado.
                O botão é decidido no cliente (ProfileCTA) pela sessão real, pra o dono
                nunca ver "Iniciar conversa" no próprio perfil mesmo com página cacheada. */}
            <ProfileCTA professionalId={pro.id} />
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
            {pro.noShowCount > 0 && (
              <span className="noshow-stat">
                <span className="label">não compareceu</span>⚠ {pro.noShowCount}
              </span>
            )}
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
              focus: item.focus,
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

          {busyDates.length > 0 && (
            <>
              <h2 className="section-title">Datas indisponíveis</h2>
              <div className="busy-dates">
                {busyDates.map((d) => (
                  <span key={d} className="busy-date mono">
                    {fmtDate(d)}
                  </span>
                ))}
              </div>
              <p className="bio" style={{ color: "var(--text-dim)", fontSize: "0.82rem" }}>
                Nessas datas o profissional já está ocupado — escolha outro dia ao iniciar a conversa.
              </p>
            </>
          )}

          <h2 className="section-title">Avaliações ({reviews.length})</h2>
          {reviews.length === 0 ? (
            <p className="bio" style={{ color: "var(--text-dim)" }}>
              Ainda sem avaliações. As notas aparecem aqui depois dos primeiros serviços concluídos.
            </p>
          ) : (
            <div className="review-list">
              {reviews.map((r) => (
                <div key={r.id} className="review-item">
                  <div className="review-item-head">
                    <span className="review-stars-static" aria-label={`${r.rating} de 5`}>
                      {"★".repeat(r.rating)}
                      <span className="review-stars-empty">{"★".repeat(5 - r.rating)}</span>
                    </span>
                    <strong>{r.clientName}</strong>
                  </div>
                  {r.comment && <p className="review-comment">“{r.comment}”</p>}
                </div>
              ))}
            </div>
          )}
        </aside>
      </section>
    </>
  );
}
