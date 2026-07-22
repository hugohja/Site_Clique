"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EVENT_TYPES, MIN_PORTFOLIO_PHOTOS, PROFESSIONAL_TYPES, isValidCity } from "@/lib/types";
import { isStrongPassword } from "@/lib/password";
import { resizeImage } from "@/lib/image-resize";
import CityField from "@/components/CityField";
import CredentialFields from "@/components/CredentialFields";
import IdentityFields from "@/components/IdentityFields";
import PortfolioEditor, { type PortfolioEntry } from "@/components/PortfolioEditor";

export default function CadastroForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [city, setCity] = useState("");
  const [outras, setOutras] = useState("");
  const [portfolio, setPortfolio] = useState<PortfolioEntry[]>([]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const fd = new FormData(form);

    // Especialidades digitadas em "Outros" (separadas por vírgula).
    const custom = outras
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    custom.forEach((s) => fd.append("specialties", s));

    if (fd.getAll("specialties").length === 0) {
      setError("Escolha ou escreva ao menos uma especialidade.");
      return;
    }
    if (!isValidCity(city)) {
      setError("Escolha sua cidade na lista de sugestões.");
      return;
    }
    if (String(fd.get("password")) !== String(fd.get("password2"))) {
      setError("As senhas não conferem.");
      return;
    }
    if (!isStrongPassword(String(fd.get("password")))) {
      setError("A senha precisa ser forte: 8+ caracteres com letra, número e caractere especial.");
      return;
    }
    if (portfolio.length < MIN_PORTFOLIO_PHOTOS) {
      setError(`Adicione ao menos ${MIN_PORTFOLIO_PHOTOS} fotos de portfólio.`);
      return;
    }

    // Monta o multipart: campos do form + fotos do uploader (com formato/capa).
    fd.delete("password2");
    fd.set("portfolioMeta", JSON.stringify(portfolio.map((p) => ({ focus: p.focus, cover: p.cover }))));

    setSending(true);
    // Comprime as imagens no navegador antes de enviar: fotos de celular têm
    // vários MB e estouram o limite de corpo da requisição (~4,5 MB na Vercel).
    const profileFile = fd.get("profilePhoto");
    if (profileFile instanceof File && profileFile.size > 0) {
      fd.set("profilePhoto", await resizeImage(profileFile, { maxDim: 1200 }));
    }
    const docFile = fd.get("documentPhoto");
    if (docFile instanceof File && docFile.size > 0) {
      fd.set("documentPhoto", await resizeImage(docFile, { maxDim: 1800 }));
    }
    for (const p of portfolio) {
      if (p.file) fd.append("portfolioPhotos", await resizeImage(p.file, { maxDim: 1600 }));
    }
    try {
      const res = await fetch("/api/professionals", { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Não foi possível concluir o cadastro. Tente de novo.");
        return;
      }
      router.push(`/profissional/${body.id}`);
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
        <label htmlFor="name">Nome ou nome do estúdio</label>
        <input id="name" name="name" required minLength={2} placeholder="Ex: Marina Castro" />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="city">Cidade</label>
          <CityField value={city} onChange={setCity} required />
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
        <input
          value={outras}
          onChange={(e) => setOutras(e.target.value)}
          placeholder="Outros (separe por vírgula): ex. Formatura, Batizado, Gastronomia"
        />
        <span className="form-hint">Marque as opções acima e/ou escreva outras especialidades.</span>
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
        <span className="form-hint">
          Sem telefone, e-mail, @ ou redes sociais — a conversa e o pagamento acontecem pela Clique.
        </span>
      </div>

      <div className="field">
        <label htmlFor="payoutPixKey">Chave PIX para receber</label>
        <input
          id="payoutPixKey"
          name="payoutPixKey"
          maxLength={140}
          placeholder="CPF, e-mail, telefone ou chave aleatória"
        />
        <span className="form-hint">
          É pra cá que a Clique te envia o repasse quando um serviço é concluído. Fica privada —
          nunca aparece no seu perfil. Dá pra cadastrar ou trocar depois nas Configurações.
        </span>
      </div>

      <hr className="form-sep" />
      <p className="form-sec-title">Portfólio (obrigatório)</p>
      <PortfolioEditor items={portfolio} onChange={setPortfolio} />

      <CredentialFields />
      <IdentityFields />

      <p className="fieldset-note">
        Ao criar, você entra logado. Sua identidade fica em análise. WhatsApp, CPF e documento ficam
        privados — o contato só é revelado a um cliente após o pagamento confirmado.
      </p>

      <label className="consent">
        <input type="checkbox" name="acceptedTerms" required />
        <span>
          Li e concordo com os{" "}
          <a href="/termos" target="_blank" rel="noopener noreferrer">
            Termos de Uso
          </a>{" "}
          e a{" "}
          <a href="/privacidade" target="_blank" rel="noopener noreferrer">
            Política de Privacidade
          </a>
          , incluindo o tratamento do meu CPF e documento para verificação de identidade.
        </span>
      </label>

      {error && <div className="form-error">{error}</div>}

      <button type="submit" className="btn" disabled={sending}>
        {sending ? "Enviando…" : "Criar conta profissional"}
      </button>
    </form>
  );
}
