"use client";

import { useEffect } from "react";

/** Registra o service worker para o app funcionar como PWA. */
export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // PWA é progressivo: se o registro falhar, o site segue funcionando.
      });
    }
  }, []);
  return null;
}
