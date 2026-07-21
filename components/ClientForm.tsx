"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isValidCity } from "@/lib/types";
import { resizeImage } from "@/lib/image-resize";
import CityField from "@/components/CityField";
import CredentialFields from "@/components/CredentialFields";
import IdentityFields from "@/components/IdentityFields";

/** Cadastro de cliente (quem contrata). Mesma verificação de identidade dos profissionais. */
export default function ClientForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [city, setCity] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    if (!isValidCity(city)) {
      setError("Escolha sua cidade na lista de sugestões.");
      return;
    }
    if (String(data.get("password")) !== String(data.get("password2"))) {
      setError("As senhas não conferem.");
      return;
    }
    data.delete("password2");
    setSending(true);
    // Comprime as imagens no navegador antes de enviar (limite de ~4,5 MB da Vercel).
    const profileFile = data.get("profilePhoto");
    if (profileFile instanceof File && profileFile.size > 0) {
      data.set("profilePhoto", await resizeImage(profileFile, { maxDim: 1200 }));
    }
    const docFile = data.get("documentPhoto");
    if (docFile instanceof File && docFile.size > 0) {
      data.set("documentPhoto", await resizeImage(docFile, { maxDim: 1800 }));
    }
    try {
      const res = await fetch("/api/clients", { method: "POST", body: data });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Não foi possível concluir o cadastro. Tente de novo.");
        return;
      }
      // A sessão já vem no cookie httpOnly da resposta.
      router.push(next && next.startsWith("/") ? next : "/");
      router.refresh();
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
          <label htmlFor="city">Cidade</label>
          <CityField value={city} onChange={setCity} required />
        </div>
      </div>

      <CredentialFields />
      <IdentityFields />

      <p className="form-hint">
        Ao criar, você entra logado. CPF e documento ficam privados; seu WhatsApp só é revelado ao
        profissional após o pagamento confirmado. Já tem conta?{" "}
        <a href="/entrar" style={{ textDecoration: "underline" }}>
          Entrar
        </a>
        .
      </p>

      {error && <div className="form-error">{error}</div>}

      <button type="submit" className="btn" disabled={sending}>
        {sending ? "Enviando…" : "Criar minha conta"}
      </button>
    </form>
  );
}
