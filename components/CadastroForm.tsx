"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CITIES, EVENT_TYPES, MIN_PORTFOLIO_PHOTOS, PROFESSIONAL_TYPES } from "@/lib/types";
import IdentityFields from "@/components/IdentityFields";

export default function CadastroForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const data = new FormData(form);

    if (data.getAll("specialties").length === 0) {
      setError("Escolha ao menos uma especialidade.");
      return;
    }
    const portfolioCount = form.elements.namedItem("portfolioPhotos") as HTMLInputElement | null;
    if (!portfolioCount?.files || portfolioCount.files.length < MIN_PORTFOLIO_PHOTOS) {
      setError(`Envie ao menos ${MIN_PORTFOLIO_PHOTOS} fotos de portfólio.`);
      return;
    }

    setSending(true);
    try {
      // Multipart: fotos e documento vão junto, sem JSON.
      const res = await fetch("/api/professionals", { method: "POST", body: data });
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
        <span className="field-label">Especialidades</span>
        <div className="checkbox-grid">
          {EVENT_TYPES.map((e) => (
            <label key={e} className="check-pill">
              <input type="checkbox" name="specialties" value={e} />
              {e}
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="priceFrom">Preço a partir de (R$)</label>
        <input id="priceFrom" name="priceFrom" type="number" min={1} step={1} required placeholder="Ex: 800" />
      </div>

      <IdentityFields />

      <div className="field">
        <label htmlFor="portfolioPhotos">Fotos do portfólio (obrigatórias)</label>
        <input id="portfolioPhotos" name="portfolioPhotos" type="file" accept="image/*" multiple required />
        <span className="form-hint">
          Selecione ao menos {MIN_PORTFOLIO_PHOTOS} de uma vez (até 12). São o que o cliente vê no
          seu perfil.
        </span>
      </div>

      <div className="field">
        <label htmlFor="bio">Bio</label>
        <textarea
          id="bio"
          name="bio"
          required
          minLength={10}
          placeholder="Conte o que você fotografa/filma/edita, há quanto tempo, o que entrega e o que te diferencia."
        />
      </div>

      <p className="form-hint">
        Ao enviar, sua identidade entra em análise. WhatsApp, CPF e documento ficam privados — o
        contato só é revelado a um cliente após o pagamento confirmado.
      </p>

      {error && <div className="form-error">{error}</div>}

      <button type="submit" className="btn" disabled={sending}>
        {sending ? "Enviando…" : "Criar meu perfil"}
      </button>
    </form>
  );
}
