"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface Me {
  account: { id: string; role: "profissional" | "cliente"; email: string; professionalId: string | null } | null;
  profile?: { id: string; name: string; profilePhotoUrl: string; verificationStatus: string } | null;
}

export default function HeaderNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => active && setMe(data))
      .catch(() => active && setMe({ account: null }));
    return () => {
      active = false;
    };
    // Recarrega o estado da sessão a cada navegação.
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe({ account: null });
    router.push("/");
    router.refresh();
  }

  if (!me || !me.account) {
    return (
      <nav className="header-nav">
        <Link href="/" className="nav-link">
          Buscar
        </Link>
        <Link href="/entrar" className="nav-link">
          Entrar
        </Link>
        <Link href="/sou-cliente" className="nav-link">
          Sou cliente
        </Link>
        <Link href="/cadastro" className="nav-link nav-link-cta">
          Sou profissional
        </Link>
      </nav>
    );
  }

  const { account, profile } = me;
  return (
    <nav className="header-nav">
      <Link href="/" className="nav-link">
        Buscar
      </Link>
      <span className="nav-account">
        {profile?.profilePhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL local
          <img className="nav-avatar" src={profile.profilePhotoUrl} alt="" />
        ) : (
          <span className="nav-avatar avatar-placeholder" aria-hidden />
        )}
        <span className="nav-who">
          {account.role} · <b>{(profile?.name ?? account.email).split(" ")[0]}</b>
        </span>
      </span>
      {account.role === "profissional" && account.professionalId && (
        <Link href={`/profissional/${account.professionalId}`} className="nav-link">
          Meu perfil
        </Link>
      )}
      <Link href="/configuracoes" className="nav-link">
        Configurações
      </Link>
      <button type="button" className="nav-link btn-ghost btn-sm" onClick={logout}>
        Sair
      </button>
    </nav>
  );
}
