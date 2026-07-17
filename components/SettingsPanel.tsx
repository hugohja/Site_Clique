"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Me {
  account: { role: "profissional" | "cliente"; email: string } | null;
  profile?: { name: string; verificationStatus: string } | null;
}

export default function SettingsPanel() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.account) router.push("/entrar");
        else setMe(data);
      });
  }, [router]);

  async function changeEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get("email");
    const res = await fetch("/api/account/email", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = await res.json();
    if (res.ok) {
      setEmailMsg({ ok: true, text: "E-mail de login atualizado." });
      setMe((m) => (m && m.account ? { ...m, account: { ...m.account, email: body.email } } : m));
      router.refresh();
    } else {
      setEmailMsg({ ok: false, text: body.error ?? "Não foi possível atualizar." });
    }
  }

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (String(data.get("next")) !== String(data.get("next2"))) {
      setPwMsg({ ok: false, text: "As senhas não conferem." });
      return;
    }
    const res = await fetch("/api/account/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current: data.get("current"), next: data.get("next") }),
    });
    const body = await res.json();
    if (res.ok) {
      setPwMsg({ ok: true, text: "Senha alterada." });
      form.reset();
    } else {
      setPwMsg({ ok: false, text: body.error ?? "Não foi possível alterar." });
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (!me || !me.account) {
    return (
      <p className="mono" style={{ color: "var(--text-dim)", marginTop: "1.5rem" }}>
        carregando…
      </p>
    );
  }

  return (
    <>
      <p style={{ color: "var(--text-dim)", marginTop: "0.7rem" }}>
        Conta <b>{me.account.role}</b>
        {me.profile ? ` · ${me.profile.name}` : ""} · identidade{" "}
        {me.profile?.verificationStatus === "verificado" ? "verificada ✓" : "em análise"}
      </p>

      <div className="settings-card">
        <h2>E-mail de login</h2>
        <form className="pro-form" style={{ marginTop: 0 }} onSubmit={changeEmail}>
          <div className="field">
            <label htmlFor="s-email">Novo e-mail</label>
            <input id="s-email" name="email" type="email" required defaultValue={me.account.email} />
          </div>
          {emailMsg && <div className={emailMsg.ok ? "form-ok" : "form-error"}>{emailMsg.text}</div>}
          <button type="submit" className="btn btn-sm">
            Salvar e-mail
          </button>
        </form>
      </div>

      <div className="settings-card">
        <h2>Senha</h2>
        <form className="pro-form" style={{ marginTop: 0 }} onSubmit={changePassword}>
          <div className="field">
            <label htmlFor="s-cur">Senha atual</label>
            <input id="s-cur" name="current" type="password" required />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="s-new">Nova senha</label>
              <input id="s-new" name="next" type="password" required minLength={6} />
            </div>
            <div className="field">
              <label htmlFor="s-new2">Confirmar</label>
              <input id="s-new2" name="next2" type="password" required minLength={6} />
            </div>
          </div>
          {pwMsg && <div className={pwMsg.ok ? "form-ok" : "form-error"}>{pwMsg.text}</div>}
          <button type="submit" className="btn btn-sm">
            Alterar senha
          </button>
        </form>
      </div>

      <div className="settings-card">
        <h2>Sessão</h2>
        <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
          Sair da conta
        </button>
      </div>
    </>
  );
}
