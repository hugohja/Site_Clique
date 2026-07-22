"use client";

import { useState } from "react";

/**
 * Pede o e-mail e dispara o link de redefinição. A resposta é sempre a mesma
 * (não revela se o e-mail tem conta) — segue o padrão anti-enumeração da API.
 */
export default function ForgotPasswordForm() {
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSending(true);
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    try {
      const res = await fetch("/api/auth/senha/solicitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setDone(body.message ?? "Se existir uma conta, enviamos um link para redefinir a senha.");
      } else {
        setError(body.error ?? "Não foi possível enviar o link.");
      }
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="form-ok" style={{ marginTop: "1rem" }}>
        {done} Confira também a caixa de spam. O link vale por 1 hora.
      </div>
    );
  }

  return (
    <form className="pro-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="email">E-mail da conta</label>
        <input id="email" name="email" type="email" required placeholder="voce@email.com" />
      </div>
      {error && <div className="form-error">{error}</div>}
      <button type="submit" className="btn" disabled={sending}>
        {sending ? "Enviando…" : "Enviar link de redefinição"}
      </button>
      <p className="form-hint">
        Lembrou a senha?{" "}
        <a href="/entrar" style={{ textDecoration: "underline" }}>
          Voltar para entrar
        </a>
      </p>
    </form>
  );
}
