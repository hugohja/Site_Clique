"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EVENT_TYPES } from "@/lib/types";

export default function NovaConversaForm({ professionalId }: { professionalId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const data = new FormData(event.currentTarget);
    setSending(true);
    try {
      const res = await fetch("/api/conversas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalId,
          clientName: data.get("clientName"),
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
      // Guarda a conversa no aparelho do cliente (não há login nesta fase).
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

  return (
    <form className="pro-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="clientName">Seu nome</label>
        <input id="clientName" name="clientName" required minLength={2} placeholder="Ex: Ana Souza" />
      </div>

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
  );
}
