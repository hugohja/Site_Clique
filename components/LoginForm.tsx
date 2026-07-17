"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    setSending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Não foi possível entrar.");
        return;
      }
      const dest =
        next && next.startsWith("/")
          ? next
          : body.role === "profissional" && body.professionalId
            ? `/profissional/${body.professionalId}`
            : "/";
      router.push(dest);
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="pro-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" required placeholder="voce@email.com" />
      </div>
      <div className="field">
        <label htmlFor="password">Senha</label>
        <input id="password" name="password" type="password" required placeholder="sua senha" />
      </div>
      {error && <div className="form-error">{error}</div>}
      <button type="submit" className="btn" disabled={sending}>
        {sending ? "Entrando…" : "Entrar"}
      </button>
      <p className="form-hint">
        Não tem conta?{" "}
        <a href="/sou-cliente" style={{ textDecoration: "underline" }}>
          Criar conta de cliente
        </a>{" "}
        ou{" "}
        <a href="/cadastro" style={{ textDecoration: "underline" }}>
          conta profissional
        </a>
        .
      </p>
    </form>
  );
}
