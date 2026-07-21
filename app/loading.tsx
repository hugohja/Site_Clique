/**
 * Feedback imediato de navegação: o App Router mostra este loading assim que
 * você clica num link cujo destino ainda está sendo renderizado no servidor
 * (páginas dinâmicas que buscam do banco). Sem isso, o clique parecia "travado"
 * e a tela só trocava de repente.
 */
export default function Loading() {
  return (
    <>
      <div className="route-progress" aria-hidden />
      <div className="container route-loading" aria-busy="true">
        <p className="mono">carregando…</p>
      </div>
    </>
  );
}
