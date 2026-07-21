"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Botão de marcar o repasse (PIX manual) como feito, no painel admin. */
export default function AdminPayoutActions({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markPaid() {
    if (!confirm("Confirmar que o PIX de repasse já foi enviado ao profissional?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/repasse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Não foi possível marcar.");
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
      <button type="button" className="btn btn-sm" disabled={busy} onClick={markPaid}>
        Marcar como repassado
      </button>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
