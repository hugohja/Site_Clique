"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Botões de moderação de um cadastro no painel admin. */
export default function AdminActions({
  kind,
  id,
}: {
  kind: "professional" | "client";
  id: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "aprovar" | "recusar") {
    if (
      action === "recusar" &&
      !confirm("Recusar e remover este cadastro? A conta é apagada e não dá pra desfazer.")
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id, action }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Não foi possível concluir.");
        return;
      }
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-actions">
      <button type="button" className="btn btn-sm" disabled={busy} onClick={() => act("aprovar")}>
        {busy ? "…" : "Aprovar"}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        disabled={busy}
        onClick={() => act("recusar")}
      >
        Recusar
      </button>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
