"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Ações do repasse (PIX manual) no painel admin: copiar a chave PIX e o valor
 * pra colar no app do banco em um toque, e marcar o repasse como feito.
 */
export default function AdminPayoutActions({
  conversationId,
  pixKey,
  amount,
}: {
  conversationId: string;
  pixKey: string | null;
  amount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"key" | "value" | null>(null);

  // Valor no formato que se digita no PIX (ex.: "0,88").
  const valueText = amount.toFixed(2).replace(".", ",");

  async function copy(text: string, what: "key" | "value") {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard indisponível — o admin copia na mão */
    }
  }

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
      {pixKey && (
        <div className="payout-copy">
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => copy(pixKey, "key")}>
            {copied === "key" ? "Chave copiada ✓" : "Copiar chave PIX"}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => copy(valueText, "value")}
          >
            {copied === "value" ? "Valor copiado ✓" : `Copiar valor (${valueText})`}
          </button>
        </div>
      )}
      <button type="button" className="btn btn-sm" disabled={busy} onClick={markPaid}>
        {busy ? "Marcando…" : "Marcar como repassado"}
      </button>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
