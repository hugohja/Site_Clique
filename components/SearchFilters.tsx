"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EVENT_TYPES, PROFESSIONAL_TYPES } from "@/lib/types";
import CityField from "@/components/CityField";

/**
 * Filtro de busca. A cidade usa autocomplete + localização (todas as cidades do
 * Brasil). O padrão automático pela cidade do usuário logado é resolvido no
 * servidor (page.tsx); aqui, escolher/geolocalizar a cidade aplica o filtro.
 */
export default function SearchFilters({
  cidade = "",
  evento = "",
  tipo = "",
  ownCity,
}: {
  cidade?: string;
  evento?: string;
  tipo?: string;
  ownCity?: string | null;
}) {
  const router = useRouter();
  const [city, setCity] = useState(cidade);
  const [event, setEvent] = useState(evento);
  const [type, setType] = useState(tipo);

  function apply(next?: { city?: string }) {
    const params = new URLSearchParams();
    // cidade sempre presente (mesmo vazia) = escolha explícita, desliga o auto.
    params.set("cidade", next?.city ?? city);
    if (event) params.set("evento", event);
    if (type) params.set("tipo", type);
    router.push(`/?${params.toString()}`);
  }

  const usingOwnCity = Boolean(ownCity && cidade && ownCity === cidade);

  return (
    <>
      <form
        className="filter-bar"
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
      >
        <CityField
          value={city}
          onChange={(v) => {
            setCity(v);
            // Escolher pela lista/localização aplica na hora.
            if (/ – [A-Z]{2}$/.test(v)) apply({ city: v });
          }}
          placeholder="Cidade — todas"
        />
        <select value={event} onChange={(e) => setEvent(e.target.value)} aria-label="Tipo de evento">
          <option value="">Todos os eventos</option>
          {EVENT_TYPES.map((ev) => (
            <option key={ev} value={ev}>
              {ev}
            </option>
          ))}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Tipo de profissional">
          <option value="">Todos os tipos</option>
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
      {cidade && (
        <p className="city-note mono">
          {usingOwnCity ? "sua cidade: " : "cidade: "}
          {cidade} ·{" "}
          <button
            type="button"
            onClick={() => {
              setCity("");
              apply({ city: "" });
            }}
          >
            ver todas as cidades
          </button>
        </p>
      )}
    </>
  );
}
