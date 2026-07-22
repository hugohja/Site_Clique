import ProCard from "@/components/ProCard";
import SearchFilters from "@/components/SearchFilters";
import AutoLocate from "@/components/AutoLocate";
import { accountRepository, clientRepository, repository } from "@/lib/data";
import { currentAccount } from "@/lib/auth";
import { EVENT_TYPES } from "@/lib/types";
import { isAdminEmail } from "@/lib/admin";
import { isProSort, type ProSort } from "@/lib/ranking";
import { sortByProximity } from "@/lib/cityCoords";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  cidade?: string;
  evento?: string;
  tipo?: string;
  ordenar?: string;
  lat?: string;
  lng?: string;
}>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const { cidade, evento, tipo, ordenar, lat, lng } = await searchParams;
  const sort: ProSort = isProSort(ordenar) ? ordenar : "relevancia";

  // Modo "perto de você": veio ?lat&lng (do GPS) → ordena por distância.
  const gLat = Number(lat);
  const gLng = Number(lng);
  const geo = Number.isFinite(gLat) && Number.isFinite(gLng) ? { lat: gLat, lng: gLng } : null;

  // Cidade da conta logada — usada pra filtrar automaticamente por padrão.
  const account = await currentAccount((id) => accountRepository.getById(id));
  const profile = account
    ? account.role === "profissional"
      ? await repository.getById(account.professionalId ?? "")
      : await clientRepository.getById(account.clientId ?? "")
    : null;
  const ownCity = profile?.city ?? null;

  // No modo "perto de você" não filtramos por cidade — mostramos todos, do mais
  // perto pro mais longe. Senão: `cidade` ausente + usuário com cidade → filtra
  // pela cidade dele; `cidade` presente (mesmo vazia) = escolha explícita.
  const effectiveCity = geo ? "" : cidade === undefined ? ownCity ?? "" : cidade;

  let professionals = (
    await repository.list({
      city: effectiveCity || undefined,
      eventType: evento,
      type: tipo,
      sort,
    })
    // Contas de admin não são profissionais — nunca aparecem na busca pública.
  ).filter((p) => !isAdminEmail(p.email));
  if (geo) professionals = sortByProximity(professionals, geo.lat, geo.lng);

  // Visitante deslogado, sem cidade escolhida e sem GPS ainda → tenta localizar.
  const shouldAutoLocate = !account && cidade === undefined && !geo;
  const hasFilter = Boolean(effectiveCity || evento || tipo);

  // Filtro de evento: só os tipos PRINCIPAIS (curados). Especialidades livres
  // que cada profissional digita não entram aqui, pra não poluir a lista.
  const eventOptions = [...EVENT_TYPES];

  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>
            Quem vai <em>fotografar</em> o seu próximo evento?
          </h1>
          <p>
            Fotógrafos, filmmakers e editores freelancers em todo o Brasil. Veja o portfólio antes
            de falar com qualquer um — e converse direto pelo chat do Clique.
          </p>
          <SearchFilters
            cidade={effectiveCity}
            evento={evento}
            tipo={tipo}
            ordenar={sort}
            ownCity={ownCity}
            eventOptions={eventOptions}
          />
        </div>
      </section>

      {shouldAutoLocate && <AutoLocate />}

      <section className="results">
        <div className="container">
          <div className="results-head">
            <h2>{geo ? "Perto de você" : hasFilter ? "Resultados" : "Profissionais"}</h2>
            <span className="results-count mono">
              {professionals.length} {professionals.length === 1 ? "perfil" : "perfis"}
            </span>
          </div>
          {geo && (
            <p className="near-note mono">
              📍 ordenado pela sua localização — os mais próximos primeiro.
            </p>
          )}
          {professionals.length === 0 ? (
            <div className="empty-state">
              <span className="mono">{hasFilter ? "NO_SIGNAL.ERR" : "AWAITING_ROLL.001"}</span>
              {hasFilter ? (
                <>
                  Nenhum profissional com esses filtros ainda. Tente ampliar a busca — ou, se você
                  trabalha com isso,{" "}
                  <a href="/cadastro" style={{ textDecoration: "underline" }}>
                    cadastre-se
                  </a>
                  .
                </>
              ) : (
                <>
                  Ainda não há profissionais cadastrados. Se você é fotógrafo, filmmaker ou editor,{" "}
                  <a href="/cadastro" style={{ textDecoration: "underline" }}>
                    seja o primeiro a aparecer aqui
                  </a>
                  .
                </>
              )}
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

      <section className="how">
        <div className="container">
          <h2 className="how-title">Como funciona</h2>
          <div className="how-steps">
            <div className="how-step">
              <span className="how-num mono">1</span>
              <h3>Busque e veja o portfólio</h3>
              <p>
                Encontre profissionais por cidade e tipo de evento e veja o trabalho antes de falar
                com qualquer um.
              </p>
            </div>
            <div className="how-step">
              <span className="how-num mono">2</span>
              <h3>Combine pelo chat</h3>
              <p>
                Converse e feche o valor pela proposta, tudo dentro do Clique — sem trocar contato
                antes da hora.
              </p>
            </div>
            <div className="how-step">
              <span className="how-num mono">3</span>
              <h3>Pague em custódia</h3>
              <p>
                A Clique segura o valor e só libera ao profissional quando você confirma, com o
                código, que ele compareceu ao evento.
              </p>
            </div>
          </div>
          <div className="trust-row">
            <span className="trust-item">✓ Identidade verificada</span>
            <span className="trust-item">🔒 Pagamento protegido em custódia</span>
            <span className="trust-item">💬 Contato só após o pagamento</span>
          </div>
        </div>
      </section>

      <section className="pro-cta">
        <div className="container pro-cta-inner">
          <div>
            <h2>É fotógrafo, filmmaker ou editor?</h2>
            <p>
              Apareça pra quem está procurando no Brasil inteiro. Sem mensalidade nesta fase — os
              pedidos chegam pelo chat.
            </p>
          </div>
          <a href="/cadastro" className="btn btn-coral pro-cta-btn">
            Criar perfil profissional
          </a>
        </div>
      </section>
    </>
  );
}
