"use client";

import { useState } from "react";
import { DOCUMENT_TYPES, GENDERS } from "@/lib/types";
import { maskCpf, maskPhone } from "@/lib/format";
import FileField from "@/components/FileField";
import FancySelect from "@/components/FancySelect";

/**
 * Bloco de identidade + verificação compartilhado pelo cadastro de profissional
 * e de cliente. Todos os campos são obrigatórios (documento e foto de perfil
 * inclusos) — é o que dá a "segurança de todos". CPF e documento são privados:
 * o servidor nunca os devolve em resposta pública.
 */
export default function IdentityFields({ profilePhotoRequired = true }: { profilePhotoRequired?: boolean }) {
  const [cpf, setCpf] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [gender, setGender] = useState("");
  const [documentType, setDocumentType] = useState("");

  return (
    <>
      <hr className="form-sep" />
      <p className="form-sec-title">Verificação de identidade</p>
      <div className="field-row">
        <div className="field">
          <label htmlFor="whatsapp">WhatsApp (com DDD)</label>
          <input
            id="whatsapp"
            name="whatsapp"
            type="tel"
            inputMode="numeric"
            required
            value={whatsapp}
            onChange={(e) => setWhatsapp(maskPhone(e.target.value))}
            placeholder="(21) 99999-8888"
          />
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
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="gender">Gênero</label>
          <FancySelect
            id="gender"
            name="gender"
            ariaLabel="Gênero"
            value={gender}
            onChange={setGender}
            options={[{ value: "", label: "Selecione" }, ...GENDERS.map((g) => ({ value: g.value, label: g.label }))]}
          />
        </div>
        <div className="field">
          <label htmlFor="birthDate">Data de nascimento</label>
          <input id="birthDate" name="birthDate" type="date" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="profilePhoto">Foto de perfil{profilePhotoRequired ? " (obrigatória)" : ""}</label>
        <FileField
          id="profilePhoto"
          name="profilePhoto"
          required={profilePhotoRequired}
          buttonLabel="Escolher foto"
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="documentType">Tipo de documento</label>
          <FancySelect
            id="documentType"
            name="documentType"
            ariaLabel="Tipo de documento"
            value={documentType}
            onChange={setDocumentType}
            options={[
              { value: "", label: "Selecione" },
              ...DOCUMENT_TYPES.map((d) => ({ value: d.value, label: d.label })),
            ]}
          />
        </div>
        <div className="field">
          <label htmlFor="documentPhoto">Foto do documento (obrigatória)</label>
          <FileField id="documentPhoto" name="documentPhoto" required buttonLabel="Escolher documento" />
          <span className="form-hint">Documento com foto, pra confirmar sua identidade. Fica privado.</span>
        </div>
      </div>
    </>
  );
}
