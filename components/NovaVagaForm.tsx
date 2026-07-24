"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EVENT_TYPES, eventDateTimeError } from "@/lib/types";
import { maskCurrency } from "@/lib/format";
import FancySelect from "@/components/FancySelect";

/** Formulário de publicação de vaga de evento (conta de cliente/empresa). */
export default function NovaVagaForm() {
  const router = useRouter();
  const [eventType, setEventType] = useState("");
  const [customEvent, setCustomEvent] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayStr = new Date().toLocaleDateString("en-CA");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const finalEvent = eventType === "__outro" ? customEvent.trim() : eventType;
    if (finalEvent.length < 2) {
      setError("Informe o tipo de evento.");
      return;
    }
    const eventDate = String(data.get("eventDate") ?? "");
    const eventTime = String(data.get("eventTime") ?? "");
    const dateErr = eventDateTimeError(eventDate, eventTime);
    if (dateErr) {
      setError(dateErr);
      return;
    }
    const min = maskCurrency(budgetMin).reais;
    const max = maskCurrency(budgetMax).reais;

    setSending(true);
    try {
      const res = await fetch("/api/oportunidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: finalEvent,
          eventDate,
          eventTime,
          eventLocation: data.get("eventLocation"),
          description: data.get("description"),
          slots: Number(data.get("slots") || 1),
          budgetMin: min > 0 ? min : null,
          budgetMax: max > 0 ? max : null,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Não foi possível publicar a vaga.");
        return;
      }
      router.push(`/oportunidades/${body.id}`);
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
          <label htmlFor="eventType">Tipo de evento</label>
          <FancySelect
            id="eventType"
            ariaLabel="Tipo de evento"
            value={eventType}
            onChange={setEventType}
            options={[
              { value: "", label: "Selecione" },
              ...EVENT_TYPES.map((e) => ({ value: e, label: e })),
              { value: "__outro", label: "Outros…" },
            ]}
          />
        </div>
        <div className="field">
          <label htmlFor="slots">Quantas vagas</label>
          <input id="slots" name="slots" type="number" min={1} max={20} defaultValue={1} required />
        </div>
      </div>

      {eventType === "__outro" && (
        <div className="field">
          <label htmlFor="customEvent">Qual evento?</label>
          <input
            id="customEvent"
            value={customEvent}
            onChange={(e) => setCustomEvent(e.target.value)}
            placeholder="Ex.: Formatura, Corporativo, Show…"
          />
        </div>
      )}

      <div className="field-row">
        <div className="field">
          <label htmlFor="eventDate">Data do evento</label>
          <input id="eventDate" name="eventDate" type="date" required min={todayStr} />
        </div>
        <div className="field">
          <label htmlFor="eventTime">Horário</label>
          <input id="eventTime" name="eventTime" type="time" required />
        </div>
      </div>

      <div className="field">
        <label htmlFor="eventLocation">Local do evento</label>
        <input id="eventLocation" name="eventLocation" required placeholder="Cidade, bairro ou espaço" />
      </div>

      <div className="field">
        <label htmlFor="description">Descrição da vaga</label>
        <textarea
          id="description"
          name="description"
          required
          minLength={10}
          placeholder="Conte o que precisa: tipo de cobertura (foto/vídeo), duração, entregas, equipe, etc. Sem telefone/e-mail — o contato é liberado pela Clique."
        />
        <span className="form-hint">
          Não coloque telefone, e-mail ou redes — isso é censurado. O combinado fecha pelo chat.
        </span>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="budgetMin">Cachê mínimo (opcional)</label>
          <input
            id="budgetMin"
            inputMode="numeric"
            value={budgetMin}
            onChange={(e) => setBudgetMin(maskCurrency(e.target.value).display)}
            placeholder="R$ 0,00"
          />
        </div>
        <div className="field">
          <label htmlFor="budgetMax">Cachê máximo (opcional)</label>
          <input
            id="budgetMax"
            inputMode="numeric"
            value={budgetMax}
            onChange={(e) => setBudgetMax(maskCurrency(e.target.value).display)}
            placeholder="R$ 0,00"
          />
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}
      <button type="submit" className="btn" disabled={sending}>
        {sending ? "Publicando…" : "Publicar vaga"}
      </button>
    </form>
  );
}
