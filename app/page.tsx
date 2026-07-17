import ProCard from "@/components/ProCard";
import { repository } from "@/lib/data";
import { CITIES, EVENT_TYPES, PROFESSIONAL_TYPES } from "@/lib/types";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ cidade?: string; evento?: string; tipo?: string }>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const { cidade, evento, tipo } = await searchParams;
  const professionals = await repository.list({ city: cidade, eventType: evento, type: tipo });
  const hasFilter = Boolean(cidade || evento || tipo);

  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>
            Quem vai <em>fotografar</em> o seu próximo evento?
          </h1>
          <p>
            Fotógrafos e filmmakers freelancers no Rio, Niterói, Goiânia e Anápolis. Veja o
            portfólio antes de falar com qualquer um — e converse direto pelo chat do Clica.
          </p>
          <form className="filter-bar" method="get" action="/">
            <select name="cidade" defaultValue={cidade ?? ""} aria-label="Cidade">
              <option value="">Todas as cidades</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select name="evento" defaultValue={evento ?? ""} aria-label="Tipo de evento">
              <option value="">Todos os eventos</option>
              {EVENT_TYPES.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
            <select name="tipo" defaultValue={tipo ?? ""} aria-label="Tipo de profissional">
              <option value="">Foto e vídeo</option>
              {PROFESSIONAL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <button type="submit" className="btn">
              Buscar
            </button>
          </form>
        </div>
      </section>

      <section className="results">
        <div className="container">
          <div className="results-head">
            <h2>{hasFilter ? "Resultados" : "Profissionais"}</h2>
            <span className="results-count mono">
              {professionals.length} {professionals.length === 1 ? "perfil" : "perfis"}
            </span>
          </div>
          {professionals.length === 0 ? (
            <div className="empty-state">
              <span className="mono">NO_SIGNAL.ERR</span>
              Nenhum profissional com esses filtros ainda. Tente ampliar a busca — ou, se você é
              fotógrafo ou filmmaker, <a href="/cadastro" style={{ textDecoration: "underline" }}>seja o primeiro a se cadastrar</a>.
            </div>
          ) : (
            <div className="card-grid">
              {professionals.map((pro) => (
                <ProCard key={pro.id} pro={pro} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
