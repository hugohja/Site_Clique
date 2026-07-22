import ProCard from "@/components/ProCard";
import SearchFilters from "@/components/SearchFilters";
import { accountRepository, clientRepository, repository } from "@/lib/data";
import { currentAccount } from "@/lib/auth";
import { EVENT_TYPES } from "@/lib/types";
import { isProSort, type ProSort } from "@/lib/ranking";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ cidade?: string; evento?: string; tipo?: string; ordenar?: string }>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const { cidade, evento, tipo, ordenar } = await searchParams;
  const sort: ProSort = isProSort(ordenar) ? ordenar : "relevancia";

  // Cidade da conta logada — usada pra filtrar automaticamente por padrão.
  const account = await currentAccount((id) => accountRepository.getById(id));
  const profile = account
    ? account.role === "profissional"
      ? await repository.getById(account.professionalId ?? "")
      : await clientRepository.getById(account.clientId ?? "")
    : null;
  const ownCity = profile?.city ?? null;

  // `cidade` ausente na URL + usuário com cidade → filtra pela cidade dele.
  // `cidade` presente (mesmo vazia) = escolha explícita.
  const effectiveCity = cidade === undefined ? ownCity ?? "" : cidade;

  const professionals = await repository.list({
    city: effectiveCity || undefined,
    eventType: evento,
    type: tipo,
    sort,
  });
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
    </>
  );
}
