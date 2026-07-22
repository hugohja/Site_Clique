"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** Redefine a senha a partir do token recebido por e-mail (?token=...). */
export default function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/auth/senha/redefinir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setOk(true);
        setTimeout(() => router.push("/entrar"), 1800);
      } else {
        setError(body.error ?? "Não foi possível redefinir a senha.");
      }
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setSending(false);
    }
  }

  if (!token) {
    return (
      <div className="form-error" style={{ marginTop: "1rem" }}>
        Link inválido. Peça um novo em{" "}
        <a href="/esqueci-senha" style={{ textDecoration: "underline" }}>
          esqueci minha senha
        </a>
        .
      </div>
    );
  }

  if (ok) {
    return (
      <div className="form-ok" style={{ marginTop: "1rem" }}>
        Senha redefinida! Redirecionando para o login…
      </div>
    );
  }

  return (
    <form className="pro-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="password">Nova senha</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          placeholder="8+ caracteres, com letra, número e símbolo"
        />
      </div>
      <div className="field">
        <label htmlFor="confirm">Confirmar nova senha</label>
        <input id="confirm" name="confirm" type="password" required placeholder="repita a senha" />
      </div>
      {error && <div className="form-error">{error}</div>}
      <button type="submit" className="btn" disabled={sending}>
        {sending ? "Salvando…" : "Redefinir senha"}
      </button>
    </form>
  );
}
