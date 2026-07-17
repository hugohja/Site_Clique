"use client";

import { useEffect, useRef, useState } from "react";

interface City {
  n: string;
  u: string;
  a: number;
  o: number;
}

// Cache do dataset (carregado uma vez por sessão de página).
let cache: City[] | null = null;
async function loadCities(): Promise<City[]> {
  if (cache) return cache;
  const res = await fetch("/cidades.json");
  cache = (await res.json()) as City[];
  return cache;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
export const cityLabel = (c: City) => `${c.n} – ${c.u}`;

function haversine(a1: number, o1: number, a2: number, o2: number) {
  const R = 6371;
  const dl = ((a2 - a1) * Math.PI) / 180;
  const dO = ((o2 - o1) * Math.PI) / 180;
  const x =
    Math.sin(dl / 2) ** 2 +
    Math.cos((a1 * Math.PI) / 180) * Math.cos((a2 * Math.PI) / 180) * Math.sin(dO / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export default function CityField({
  name = "city",
  value,
  onChange,
  required,
  placeholder = "Digite e escolha sua cidade",
}: {
  name?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  const [cities, setCities] = useState<City[]>([]);
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadCities().then(setCities);
  }, []);

  function search(q: string) {
    const nq = norm(q.trim());
    if (nq.length < 2) {
      setSuggestions([]);
      return;
    }
    const starts: City[] = [];
    const incl: City[] = [];
    for (const c of cities) {
      const nn = norm(c.n);
      if (nn.startsWith(nq)) starts.push(c);
      else if (nn.includes(nq)) incl.push(c);
      if (starts.length >= 8) break;
    }
    setSuggestions([...starts, ...incl].slice(0, 8));
    setOpen(true);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      alert("Seu navegador não suporta localização.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        let best: City | null = null;
        let bd = Infinity;
        for (const c of cities) {
          const d = haversine(pos.coords.latitude, pos.coords.longitude, c.a, c.o);
          if (d < bd) {
            bd = d;
            best = c;
          }
        }
        if (best) onChange(cityLabel(best));
      },
      () => {
        setBusy(false);
        alert("Não consegui pegar sua localização (permissão negada ou indisponível). Digite a cidade.");
      },
      { timeout: 8000 }
    );
  }

  return (
    <div className="city-field">
      <input
        name={name}
        value={value}
        required={required}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          search(e.target.value);
        }}
        onFocus={(e) => search(e.target.value)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 160);
        }}
      />
      <button
        type="button"
        className="city-geo"
        title="Usar minha localização"
        disabled={busy}
        onClick={useMyLocation}
      >
        {busy ? "…" : "📍"}
      </button>
      {open && suggestions.length > 0 && (
        <div className="city-suggest">
          {suggestions.map((c) => (
            <button
              key={`${c.n}-${c.u}-${c.a}`}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                if (blurTimer.current) clearTimeout(blurTimer.current);
                onChange(cityLabel(c));
                setOpen(false);
              }}
            >
              {c.n}
              <span className="uf">{c.u}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
