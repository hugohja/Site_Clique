"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface Me {
  account: {
    id: string;
    role: "profissional" | "cliente";
    email: string;
    professionalId: string | null;
    isAdmin?: boolean;
  } | null;
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
        {/* Cliente não precisa se cadastrar pra navegar — a conta só é pedida
            no momento de conversar com um profissional. Por isso não há CTA
            de "Sou cliente" aqui. */}
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
      <Link href="/conversas" className="nav-link">
        Conversas
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
        <>
          <Link href="/carteira" className="nav-link">
            Carteira
          </Link>
          <Link href={`/profissional/${account.professionalId}`} className="nav-link">
            Meu perfil
          </Link>
        </>
      )}
      {account.isAdmin && (
        <Link href="/admin" className="nav-link">
          Admin
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
