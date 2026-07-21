"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Botões de resolução de disputa no painel admin. */
export default function AdminDisputeActions({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve(outcome: "reembolsar" | "liberar") {
    const msg =
      outcome === "reembolsar"
        ? "Reembolsar o cliente? A nota do profissional vai cair (conta como não comparecimento)."
        : "Liberar o pagamento ao profissional (relato improcedente)?";
    if (!confirm(msg)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/disputa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, outcome }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Não foi possível resolver.");
        return;
      }
      router.refresh();
    } catch {
      setError("Falha de conexão.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-actions">
      <button type="button" className="btn btn-sm" disabled={busy} onClick={() => resolve("reembolsar")}>
        Reembolsar cliente
      </button>
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        disabled={busy}
        onClick={() => resolve("liberar")}
      >
        Liberar ao profissional
      </button>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
