"use client";

import { useEffect, useState } from "react";

/**
 * Chave PIX de recebimento do profissional (privada). É pra onde a Clique faz
 * o repasse depois que o serviço é concluído. Nunca aparece em tela pública.
 */
export default function PayoutKeyEditor() {
  const [value, setValue] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/account/payout")
      .then((r) => r.json())
      .then((d) => {
        setValue(d.payoutPixKey ?? "");
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      const res = await fetch("/api/account/payout", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutPixKey: value.trim() }),
      });
      const body = await res.json();
      if (res.ok) setMsg({ ok: true, text: "Chave PIX salva." });
      else setMsg({ ok: false, text: body.error ?? "Não foi possível salvar." });
    } catch {
      setMsg({ ok: false, text: "Falha de conexão. Tente de novo." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="pro-form" style={{ marginTop: 0 }} onSubmit={save}>
      <div className="field">
        <label htmlFor="s-pix">Chave PIX para receber</label>
        <input
          id="s-pix"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="CPF, e-mail, telefone ou chave aleatória"
          disabled={!loaded}
        />
        <span className="form-hint">
          É pra cá que a Clique envia o repasse quando você conclui um serviço. Fica privada.
        </span>
      </div>
      {msg && <div className={msg.ok ? "form-ok" : "form-error"}>{msg.text}</div>}
      <button type="submit" className="btn btn-sm" disabled={saving || !loaded}>
        {saving ? "Salvando…" : "Salvar chave PIX"}
      </button>
    </form>
  );
}
