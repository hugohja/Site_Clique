"use client";

import { useEffect, useState } from "react";

/**
 * Agenda do profissional: datas em que ele está ocupado/indisponível. O cliente
 * vê essas datas no perfil e é impedido de abrir uma conversa nelas.
 */
function formatBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function AgendaEditor() {
  const [dates, setDates] = useState<string[]>([]);
  const [novaData, setNovaData] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  useEffect(() => {
    fetch("/api/account/agenda")
      .then((r) => r.json())
      .then((d) => {
        setDates(Array.isArray(d.unavailableDates) ? d.unavailableDates : []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  function add() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(novaData) || novaData < today) {
      setMsg({ ok: false, text: "Escolha uma data futura." });
      return;
    }
    if (dates.includes(novaData)) {
      setNovaData("");
      return;
    }
    setDates([...dates, novaData].sort());
    setNovaData("");
    setMsg(null);
  }

  function remove(d: string) {
    setDates(dates.filter((x) => x !== d));
  }

  async function save() {
    setMsg(null);
    setSaving(true);
    try {
      const res = await fetch("/api/account/agenda", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unavailableDates: dates }),
      });
      const body = await res.json();
      if (res.ok) {
        setDates(Array.isArray(body.unavailableDates) ? body.unavailableDates : dates);
        setMsg({ ok: true, text: "Agenda salva." });
      } else {
        setMsg({ ok: false, text: body.error ?? "Não foi possível salvar." });
      }
    } catch {
      setMsg({ ok: false, text: "Falha de conexão. Tente de novo." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="agenda-editor">
      <p className="form-hint" style={{ marginTop: 0 }}>
        Marque os dias em que você já está ocupado. Os clientes veem essas datas no seu perfil e não
        conseguem abrir uma conversa pedindo um evento nelas.
      </p>
      <div className="agenda-add">
        <input
          type="date"
          min={today}
          value={novaData}
          onChange={(e) => setNovaData(e.target.value)}
          disabled={!loaded}
          aria-label="Data indisponível"
        />
        <button type="button" className="btn btn-sm btn-ghost" onClick={add} disabled={!loaded || !novaData}>
          Adicionar
        </button>
      </div>

      {dates.length === 0 ? (
        <p className="form-hint">Nenhuma data marcada — você aparece disponível para qualquer dia.</p>
      ) : (
        <ul className="agenda-list">
          {dates.map((d) => (
            <li key={d}>
              <span className="mono">{formatBR(d)}</span>
              <button type="button" className="agenda-remove" onClick={() => remove(d)} aria-label={`Remover ${formatBR(d)}`}>
                remover
              </button>
            </li>
          ))}
        </ul>
      )}

      {msg && <div className={msg.ok ? "form-ok" : "form-error"}>{msg.text}</div>}
      <button type="button" className="btn btn-sm" onClick={save} disabled={saving || !loaded}>
        {saving ? "Salvando…" : "Salvar agenda"}
      </button>
    </div>
  );
}
