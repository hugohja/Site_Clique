"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Para visitantes DESLOGADOS na home, tenta detectar a localização (GPS) e
 * reordena a busca por proximidade (redireciona com ?lat&lng, arredondados
 * pra ~1km por privacidade). Pede permissão uma vez; se negarem, não insiste.
 * Não renderiza nada.
 */
const DENIED_KEY = "clica_geo_denied";

export default function AutoLocate() {
  const router = useRouter();
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    if (localStorage.getItem(DENIED_KEY)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(2);
        const lng = pos.coords.longitude.toFixed(2);
        router.replace(`/?lat=${lat}&lng=${lng}`);
      },
      () => {
        // Permissão negada/indisponível — lembra pra não pedir de novo.
        localStorage.setItem(DENIED_KEY, "1");
      },
      { timeout: 8000, maximumAge: 600000 }
    );
  }, [router]);

  return null;
}
