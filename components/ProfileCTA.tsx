"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Me {
  account: {
    role: "profissional" | "cliente";
    professionalId: string | null;
    isAdmin?: boolean;
  } | null;
}

/**
 * Botão de ação do perfil, decidido no CLIENTE a partir da sessão real
 * (/api/auth/me) — não do render do servidor, que pode vir cacheado. Assim o
 * dono do perfil nunca vê "Iniciar conversa" no próprio perfil.
 */
export default function ProfileCTA({ professionalId }: { professionalId: string }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => active && setMe(d))
      .catch(() => active && setMe({ account: null }))
      .finally(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, []);

  // Enquanto carrega a sessão, um placeholder neutro (evita piscar o botão errado).
  if (!loaded) {
    return (
      <span className="btn-contact btn-contact-ghost" aria-hidden>
        …
      </span>
    );
  }

  const acc = me?.account;
  const isOwner = acc?.role === "profissional" && acc.professionalId === professionalId;

  if (isOwner) {
    return (
      <Link href="/configuracoes" className="btn-contact">
        Configurações
      </Link>
    );
  }
  if (acc?.isAdmin) {
    return (
      <Link href={`/admin/profissional/${professionalId}`} className="btn-contact">
        Editar (admin)
      </Link>
    );
  }
  return (
    <Link href={`/profissional/${professionalId}/conversar`} className="btn-contact">
      Iniciar conversa
    </Link>
  );
}
