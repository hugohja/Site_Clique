"use client";

import { useState } from "react";
import { DOCUMENT_TYPES, GENDERS } from "@/lib/types";
import { maskCpf } from "@/lib/format";

/**
 * Bloco de identidade + verificação compartilhado pelo cadastro de profissional
 * e de cliente. Todos os campos são obrigatórios (documento e foto de perfil
 * inclusos) — é o que dá a "segurança de todos". CPF e documento são privados:
 * o servidor nunca os devolve em resposta pública.
 */
export default function IdentityFields({ profilePhotoRequired = true }: { profilePhotoRequired?: boolean }) {
  const [cpf, setCpf] = useState("");

  return (
    <>
      <div className="field-row">
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" required placeholder="voce@email.com" />
        </div>
        <div className="field">
          <label htmlFor="whatsapp">WhatsApp (com DDD)</label>
          <input id="whatsapp" name="whatsapp" type="tel" required placeholder="Ex: 21 99999-8888" />
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
          <label htmlFor="birthDate">Data de nascimento</label>
          <input id="birthDate" name="birthDate" type="date" />
        </div>
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
          Usado só pra identificação — nunca aparece em tela pública.
        </span>
      </div>

      <div className="field">
        <label htmlFor="profilePhoto">Foto de perfil{profilePhotoRequired ? " (obrigatória)" : ""}</label>
        <input
          id="profilePhoto"
          name="profilePhoto"
          type="file"
          accept="image/*"
          required={profilePhotoRequired}
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="documentType">Tipo de documento</label>
          <select id="documentType" name="documentType" required defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {DOCUMENT_TYPES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="documentPhoto">Foto do documento (obrigatória)</label>
          <input id="documentPhoto" name="documentPhoto" type="file" accept="image/*" required />
          <span className="form-hint">Documento com foto, pra confirmar sua identidade. Fica privado.</span>
        </div>
      </div>
    </>
  );
}
