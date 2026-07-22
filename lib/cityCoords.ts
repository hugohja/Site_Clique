import cidades from "../public/cidades.json";

/**
 * Coordenadas das cidades (IBGE) para ordenar a busca por proximidade.
 * SERVER-ONLY: importa o dataset de /public/cidades.json (~300KB) uma vez.
 * Não use em componente client — traria o dataset todo pro navegador.
 */
interface RawCity {
  n: string;
  u: string;
  a: number; // latitude
  o: number; // longitude
}
const CITIES = cidades as RawCity[];

const norm = (s: string) =>
  s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

let map: Map<string, { a: number; o: number }> | null = null;
function coordMap(): Map<string, { a: number; o: number }> {
  if (!map) {
    map = new Map();
    for (const c of CITIES) map.set(norm(`${c.n} – ${c.u}`), { a: c.a, o: c.o });
  }
  return map;
}

function haversineKm(a1: number, o1: number, a2: number, o2: number): number {
  const R = 6371;
  const dl = ((a2 - a1) * Math.PI) / 180;
  const dO = ((o2 - o1) * Math.PI) / 180;
  const x =
    Math.sin(dl / 2) ** 2 +
    Math.cos((a1 * Math.PI) / 180) * Math.cos((a2 * Math.PI) / 180) * Math.sin(dO / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Distância (km) do ponto até a cidade (label "Nome – UF"); null se desconhecida. */
export function cityDistanceKm(lat: number, lng: number, cityLabel: string): number | null {
  const c = coordMap().get(norm(cityLabel));
  return c ? haversineKm(lat, lng, c.a, c.o) : null;
}

/** Ordena do mais perto pro mais longe (cidades desconhecidas por último). */
export function sortByProximity<T extends { city: string }>(
  items: T[],
  lat: number,
  lng: number
): T[] {
  return [...items].sort((a, b) => {
    const da = cityDistanceKm(lat, lng, a.city) ?? Infinity;
    const db = cityDistanceKm(lat, lng, b.city) ?? Infinity;
    return da - db;
  });
}
