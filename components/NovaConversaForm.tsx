"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EVENT_TYPES, type PublicClient } from "@/lib/types";

/**
 * Só clientes cadastrados (conta verificada) iniciam conversa. Sem login, o
 * "usuário atual" é o id guardado em localStorage no cadastro de cliente.
 */
export default function NovaConversaForm({ professionalId }: { professionalId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [client, setClient] = useState<PublicClient | null>(null);
  const [checking, setChecking] = useState(true);

  const backHere = `/profissional/${professionalId}/conversar`;

  useEffect(() => {
    let active = true;
    const id = (() => {
      try {
        return localStorage.getItem("clica:clientId");
      } catch {
        return null;
      }
    })();
    if (!id) {
      setChecking(false);
      return;
    }
    fetch(`/api/clients/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => {
        if (active) setClient(c);
      })
      .finally(() => active && setChecking(false));
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return;
    setError(null);
    const data = new FormData(event.currentTarget);
    setSending(true);
    try {
      const res = await fetch("/api/conversas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalId,
          clientId: client.id,
          eventType: data.get("eventType"),
          eventDate: data.get("eventDate"),
          eventLocation: data.get("eventLocation"),
          message: data.get("message"),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Não foi possível iniciar a conversa.");
        return;
      }
      try {
        const mine = JSON.parse(localStorage.getItem("clica:conversas") ?? "[]");
        mine.push(body.id);
        localStorage.setItem("clica:conversas", JSON.stringify(mine));
      } catch {
        // localStorage indisponível não impede o fluxo.
      }
      router.push(`/conversa/${body.id}`);
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setSending(false);
    }
  }

  if (checking) {
    return (
      <p className="mono" style={{ color: "var(--text-dim)", marginTop: "2rem" }}>
        verificando seu cadastro…
      </p>
    );
  }

  if (!client) {
    return (
      <div className="gate-card">
        <h2 className="section-title">Antes de conversar, crie sua conta de cliente</h2>
        <p>
          Pra segurança dos dois lados, quem contrata também passa por um cadastro com verificação
          de identidade. É rápido e você só faz uma vez.
        </p>
        <Link href={`/sou-cliente?next=${encodeURIComponent(backHere)}`} className="btn">
          Criar conta de cliente
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="client-chip mono">
        conversando como <strong>{client.name}</strong> · identidade{" "}
        {client.verificationStatus === "verificado" ? "verificada ✓" : "em análise"}
      </p>
      <form className="pro-form" onSubmit={handleSubmit}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="eventType">Tipo de evento</label>
            <select id="eventType" name="eventType" required defaultValue="">
              <option value="" disabled>
                Selecione
              </option>
              {EVENT_TYPES.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="eventDate">Data do evento</label>
            <input id="eventDate" name="eventDate" type="date" required />
          </div>
        </div>

        <div className="field">
          <label htmlFor="eventLocation">Local do evento (cidade / espaço)</label>
          <input
            id="eventLocation"
            name="eventLocation"
            required
            minLength={3}
            placeholder="Ex: Goiânia, Salão Buriti"
          />
        </div>

        <div className="field">
          <label htmlFor="message">Primeira mensagem</label>
          <textarea
            id="message"
            name="message"
            required
            minLength={5}
            placeholder="Conte o que você precisa: horas de cobertura, estilo, o que é importante pra você."
          />
          <span className="form-hint">
            A conversa fica dentro do Clica. Mensagens com telefone, links ou redes sociais são
            censuradas automaticamente até o pagamento ser confirmado.
          </span>
        </div>

        {error && <div className="form-error">{error}</div>}

        <button type="submit" className="btn" disabled={sending}>
          {sending ? "Enviando…" : "Enviar mensagem"}
        </button>
      </form>
    </>
  );
}
