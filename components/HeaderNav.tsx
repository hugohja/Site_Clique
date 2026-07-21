"use client";

import { useEffect, useRef, useState } from "react";
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
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Fecha o menu ao trocar de página.
  useEffect(() => setOpen(false), [pathname]);

  // Fecha ao clicar fora ou apertar Esc.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe({ account: null });
    setOpen(false);
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
  const firstName = (profile?.name ?? account.email).split(" ")[0];

  return (
    <nav className="header-nav">
      <Link href="/" className="nav-link">
        Buscar
      </Link>
      <Link href="/conversas" className="nav-link">
        Conversas
      </Link>

      <div className="account-menu" ref={menuRef}>
        <button
          type="button"
          className="avatar-btn"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Sua conta"
          onClick={() => setOpen((v) => !v)}
        >
          {profile?.profilePhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL local
            <img className="avatar-btn-img" src={profile.profilePhotoUrl} alt="" />
          ) : (
            <span className="avatar-btn-img avatar-placeholder" aria-hidden />
          )}
        </button>

        {open && (
          <div className="account-dropdown" role="menu">
            <div className="account-dropdown-head">
              {profile?.profilePhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="dropdown-avatar" src={profile.profilePhotoUrl} alt="" />
              ) : (
                <span className="dropdown-avatar avatar-placeholder" aria-hidden />
              )}
              <div className="account-dropdown-id">
                <strong>{firstName}</strong>
                <span className="mono dim">{account.role}</span>
              </div>
            </div>

            <div className="account-dropdown-links">
              {account.role === "profissional" && account.professionalId && (
                <>
                  <Link href={`/profissional/${account.professionalId}`} role="menuitem" className="dropdown-link">
                    Meu perfil
                  </Link>
                  <Link href="/carteira" role="menuitem" className="dropdown-link">
                    Carteira
                  </Link>
                </>
              )}
              {account.isAdmin && (
                <Link href="/admin" role="menuitem" className="dropdown-link">
                  Painel admin
                </Link>
              )}
              <Link href="/configuracoes" role="menuitem" className="dropdown-link">
                Configurações
              </Link>
            </div>

            <button type="button" role="menuitem" className="dropdown-link dropdown-signout" onClick={logout}>
              Sair
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
