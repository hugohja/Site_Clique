"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EVENT_TYPES } from "@/lib/types";

interface Me {
  account: { role: "profissional" | "cliente" } | null;
  profile?: { name: string; verificationStatus: string } | null;
}

/** Só uma conta de CLIENTE logada inicia conversa (contas são separadas). */
export default function NovaConversaForm({ professionalId }: { professionalId: string }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [eventType, setEventType] = useState("");
  const [customEvent, setCustomEvent] = useState("");
  const backHere = `/profissional/${professionalId}/conversar`;

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe({ account: null }));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe({ account: null });
    router.refresh();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const finalEvent = eventType === "__outro" ? customEvent.trim() : eventType;
    if (finalEvent.length < 2) {
      setError("Informe o tipo de evento.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/conversas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalId,
          eventType: finalEvent,
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
      router.push(`/conversa/${body.id}`);
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setSending(false);
    }
  }

  if (!me) {
    return (
      <p className="mono" style={{ color: "var(--text-dim)", marginTop: "2rem" }}>
        verificando sua conta…
      </p>
    );
  }

  if (!me.account) {
    return (
      <div className="gate-card">
        <h2 className="section-title">Entre pra conversar</h2>
        <p>
          Pra falar com um profissional você precisa de uma conta de cliente, com verificação de
          identidade — pra segurança dos dois lados.
        </p>
        <div className="gate-actions">
          <Link href={`/sou-cliente?next=${encodeURIComponent(backHere)}`} className="btn">
            Criar conta de cliente
          </Link>
          <Link href={`/entrar?next=${encodeURIComponent(backHere)}`} className="btn btn-ghost">
            Já tenho conta
          </Link>
        </div>
      </div>
    );
  }

  if (me.account.role === "profissional") {
    return (
      <div className="gate-card">
        <h2 className="section-title">Você está numa conta profissional</h2>
        <p>
          Contas são separadas: pra contratar alguém, saia e entre (ou crie) uma conta de cliente.
        </p>
        <div className="gate-actions">
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Sair desta conta
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <p className="client-chip mono">
        conversando como <strong>{me.profile?.name}</strong> · identidade{" "}
        {me.profile?.verificationStatus === "verificado" ? "verificada ✓" : "em análise"}
      </p>
      <form className="pro-form" onSubmit={handleSubmit}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="eventType">Tipo de evento</label>
            <select
              id="eventType"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              required
            >
              <option value="" disabled>
                Selecione
              </option>
              {EVENT_TYPES.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
              <option value="__outro">Outros…</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="eventDate">Data do evento</label>
            <input id="eventDate" name="eventDate" type="date" required />
          </div>
        </div>

        {eventType === "__outro" && (
          <div className="field">
            <label htmlFor="customEvent">Qual evento?</label>
            <input
              id="customEvent"
              value={customEvent}
              onChange={(e) => setCustomEvent(e.target.value)}
              required
              placeholder="Ex: Formatura, Batizado, Feira, Show…"
            />
          </div>
        )}

        <div className="field">
          <label htmlFor="eventLocation">Local do evento (cidade / espaço)</label>
          <input id="eventLocation" name="eventLocation" required minLength={3} placeholder="Ex: Goiânia, Salão Buriti" />
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
            Telefone, links e redes sociais são censurados até o pagamento ser confirmado.
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
