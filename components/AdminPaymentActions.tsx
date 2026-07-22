"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Botão de confirmar o recebimento do PIX (cobrança manual), no painel admin. */
export default function AdminPaymentActions({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    if (!window.confirm("Confirmar que o PIX do cliente CAIU na conta da Clique? Isso libera o contato.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/pagamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Não foi possível confirmar.");
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
      <button type="button" className="btn btn-sm" disabled={busy} onClick={onConfirm}>
        Confirmar recebimento
      </button>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
