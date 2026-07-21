"use client";

import { useState } from "react";

/**
 * Seletor de arquivo estilizado (substitui o input nativo "Choose File").
 *
 * O input real fica por cima, invisível e clicável, cobrindo todo o controle —
 * assim continua sendo validado pelo navegador (required) e enviado no
 * FormData normalmente, mas o visual é o nosso (botão + nome do arquivo).
 */
export default function FileField({
  id,
  name,
  accept = "image/*",
  required,
  buttonLabel = "Escolher arquivo",
}: {
  id: string;
  name: string;
  accept?: string;
  required?: boolean;
  buttonLabel?: string;
}) {
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className={`file-field${fileName ? " has-file" : ""}`}>
      <span className="file-btn" aria-hidden>
        {buttonLabel}
      </span>
      <span className="file-name">{fileName ?? "nenhum arquivo selecionado"}</span>
      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
        className="file-native"
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
      />
    </div>
  );
}
