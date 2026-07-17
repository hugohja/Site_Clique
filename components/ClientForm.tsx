"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CITIES } from "@/lib/types";
import IdentityFields from "@/components/IdentityFields";

/** Cadastro de cliente (quem contrata). Mesma verificação de identidade dos profissionais. */
export default function ClientForm() {
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
      const res = await fetch("/api/clients", { method: "POST", body: data });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Não foi possível concluir o cadastro. Tente de novo.");
        return;
      }
      // "Usuário atual" sem login: guarda o id no aparelho.
      try {
        localStorage.setItem("clica:clientId", body.id);
      } catch {
        // localStorage indisponível não impede o fluxo.
      }
      router.push(next && next.startsWith("/") ? next : "/");
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="pro-form" onSubmit={handleSubmit}>
      <div className="field-row">
        <div className="field">
          <label htmlFor="name">Nome completo</label>
          <input id="name" name="name" required minLength={2} placeholder="Ex: Ana Souza" />
        </div>
        <div className="field">
          <label htmlFor="city">Cidade (opcional)</label>
          <select id="city" name="city" defaultValue="">
            <option value="">Prefiro não informar</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <IdentityFields />

      <p className="form-hint">
        Ao enviar, sua identidade entra em análise. CPF e documento ficam privados; seu WhatsApp só
        é revelado ao profissional após o pagamento confirmado.
      </p>

      {error && <div className="form-error">{error}</div>}

      <button type="submit" className="btn" disabled={sending}>
        {sending ? "Enviando…" : "Criar minha conta"}
      </button>
    </form>
  );
}
