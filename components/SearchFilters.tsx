"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PROFESSIONAL_TYPES } from "@/lib/types";
import { PRO_SORTS } from "@/lib/ranking";
import CityField from "@/components/CityField";
import FancySelect from "@/components/FancySelect";

/**
 * Filtro de busca. A cidade usa autocomplete + localização (todas as cidades do
 * Brasil). O padrão automático pela cidade do usuário logado é resolvido no
 * servidor (page.tsx); aqui, escolher/geolocalizar a cidade aplica o filtro.
 */
export default function SearchFilters({
  cidade = "",
  evento = "",
  tipo = "",
  ordenar = "relevancia",
  ownCity,
  eventOptions = [],
}: {
  cidade?: string;
  evento?: string;
  tipo?: string;
  ordenar?: string;
  ownCity?: string | null;
  eventOptions?: string[];
}) {
  const router = useRouter();
  const [city, setCity] = useState(cidade);
  const [event, setEvent] = useState(evento);
  const [type, setType] = useState(tipo);
  const [sort, setSort] = useState(ordenar);

  function apply(next?: { city?: string; sort?: string }) {
    const params = new URLSearchParams();
    // cidade sempre presente (mesmo vazia) = escolha explícita, desliga o auto.
    params.set("cidade", next?.city ?? city);
    if (event) params.set("evento", event);
    if (type) params.set("tipo", type);
    const s = next?.sort ?? sort;
    if (s && s !== "relevancia") params.set("ordenar", s);
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
        <FancySelect
          value={event}
          onChange={setEvent}
          ariaLabel="Tipo de evento"
          options={[{ value: "", label: "Todos os eventos" }, ...eventOptions.map((ev) => ({ value: ev, label: ev }))]}
        />
        <FancySelect
          value={type}
          onChange={setType}
          ariaLabel="Tipo de profissional"
          options={[
            { value: "", label: "Todos os tipos" },
            ...PROFESSIONAL_TYPES.map((t) => ({ value: t.value, label: t.label })),
          ]}
        />
        <FancySelect
          value={sort}
          onChange={(v) => {
            setSort(v);
            apply({ sort: v });
          }}
          ariaLabel="Ordenar por"
          options={PRO_SORTS.map((s) => ({ value: s.value, label: s.label }))}
        />
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
