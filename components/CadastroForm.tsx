"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CITIES, EVENT_TYPES, PROFESSIONAL_TYPES } from "@/lib/types";

export default function CadastroForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: data.get("name"),
      city: data.get("city"),
      type: data.get("type"),
      specialties: data.getAll("specialties"),
      priceFrom: Number(data.get("priceFrom")),
      whatsapp: data.get("whatsapp"),
      bio: data.get("bio"),
    };

    if (payload.specialties.length === 0) {
      setError("Escolha ao menos uma especialidade.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/professionals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Não foi possível concluir o cadastro. Tente de novo.");
        return;
      }
      router.push(`/profissional/${body.id}`);
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="pro-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="name">Nome ou nome do estúdio</label>
        <input id="name" name="name" required minLength={2} placeholder="Ex: Marina Castro" />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="city">Cidade</label>
          <select id="city" name="city" required defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="type">Você é</label>
          <select id="type" name="type" required defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {PROFESSIONAL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <span className="field label" style={{ fontSize: "0.88rem", color: "var(--text-dim)" }}>
          Especialidades
        </span>
        <div className="checkbox-grid">
          {EVENT_TYPES.map((e) => (
            <label key={e} className="check-pill">
              <input type="checkbox" name="specialties" value={e} />
              {e}
            </label>
          ))}
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="priceFrom">Preço a partir de (R$)</label>
          <input
            id="priceFrom"
            name="priceFrom"
            type="number"
            min={1}
            step={1}
            required
            placeholder="Ex: 800"
          />
        </div>
        <div className="field">
          <label htmlFor="whatsapp">WhatsApp (com DDD)</label>
          <input
            id="whatsapp"
            name="whatsapp"
            type="tel"
            required
            placeholder="Ex: 21 99999-8888"
          />
          <span className="form-hint">É pra ele que o cliente vai ligar. Nada de login por enquanto.</span>
        </div>
      </div>

      <div className="field">
        <label htmlFor="bio">Bio</label>
        <textarea
          id="bio"
          name="bio"
          required
          minLength={10}
          placeholder="Conte o que você fotografa/filma, há quanto tempo, o que entrega e o que te diferencia."
        />
      </div>

      {error && <div className="form-error">{error}</div>}

      <button type="submit" className="btn" disabled={sending}>
        {sending ? "Enviando…" : "Criar meu perfil"}
      </button>
    </form>
  );
}
