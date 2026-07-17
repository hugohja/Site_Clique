"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CITIES, EVENT_TYPES, GENDERS, PROFESSIONAL_TYPES } from "@/lib/types";

function maskCpf(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

export default function CadastroForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [cpf, setCpf] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const data = new FormData(form);

    if (data.getAll("specialties").length === 0) {
      setError("Escolha ao menos uma especialidade.");
      return;
    }

    setSending(true);
    try {
      // Multipart: os arquivos de foto vão junto, sem JSON.
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

      <div className="field-row">
        <div className="field">
          <label htmlFor="gender">Gênero</label>
          <select id="gender" name="gender" required defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="cpf">CPF</label>
          <input
            id="cpf"
            name="cpf"
            required
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => setCpf(maskCpf(e.target.value))}
            pattern="\d{3}\.\d{3}\.\d{3}-\d{2}"
          />
          <span className="form-hint">
            Usado só pra identificação — nunca aparece no seu perfil nem em tela pública.
          </span>
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
          <span className="form-hint">
            Nunca aparece no seu perfil — só é liberado pro cliente após o pagamento confirmado.
          </span>
        </div>
      </div>

      <div className="field">
        <label htmlFor="profilePhoto">Foto de perfil</label>
        <input id="profilePhoto" name="profilePhoto" type="file" accept="image/*" />
        <span className="form-hint">Opcional nesta fase de teste. Até 4 MB.</span>
      </div>

      <div className="field">
        <label htmlFor="portfolioPhotos">Fotos do portfólio</label>
        <input id="portfolioPhotos" name="portfolioPhotos" type="file" accept="image/*" multiple />
        <span className="form-hint">
          Selecione várias de uma vez (até 12, 4 MB cada). Sem fotos, o perfil usa placeholders.
        </span>
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
