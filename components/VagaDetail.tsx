"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatBRL, maskCurrency, typeLabel } from "@/lib/format";
import type { ProfessionalType } from "@/lib/types";

interface Opp {
  id: string;
  clientName: string;
  eventType: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  description: string;
  slots: number;
  budgetMin: number | null;
  budgetMax: number | null;
  status: "aberta" | "encerrada";
}
interface AppItem {
  id: string;
  professionalId: string;
  professionalName: string;
  message: string;
  proposedAmount: number | null;
  status: "pendente" | "escolhida" | "recusada";
  createdAt: string;
  pro: { city: string; type: string; rating: number; reviewCount: number; profilePhotoUrl: string; verified: boolean } | null;
}
interface Payload {
  opportunity: Opp;
  viewerRole: "dono" | "profissional" | "outro";
  applications: AppItem[];
  myApplication: { id: string; message: string; proposedAmount: number | null; status: string } | null;
}

export default function VagaDetail({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/oportunidades/${id}`, { cache: "no-store" });
    if (res.status === 404) return setNotFound(true);
    if (res.ok) setData(await res.json());
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 5) {
      setError("Escreva uma mensagem para a empresa.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/oportunidades/${id}/candidatar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, amount: maskCurrency(amount).reais }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Não foi possível se candidatar.");
        return;
      }
      await load();
    } catch {
      setError("Falha de conexão.");
    } finally {
      setBusy(false);
    }
  }

  async function choose(applicationId: string) {
    if (!confirm("Escolher este profissional? Abre uma conversa com pagamento em custódia.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/oportunidades/${id}/escolher`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Não foi possível escolher.");
        return;
      }
      router.push(`/conversa/${body.conversationId}`);
    } catch {
      setError("Falha de conexão.");
    } finally {
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <div className="empty-state" style={{ marginTop: "1.5rem" }}>
        <span className="mono">404_VAGA</span>
        Vaga não encontrada.{" "}
        <Link href="/oportunidades" style={{ textDecoration: "underline" }}>
          ver vagas
        </Link>
      </div>
    );
  }
  if (!data) return <p className="mono" style={{ color: "var(--text-dim)" }}>carregando…</p>;

  const { opportunity: o, viewerRole, applications, myApplication } = data;
  const range =
    o.budgetMin != null && o.budgetMax != null
      ? `${formatBRL(o.budgetMin)}–${formatBRL(o.budgetMax)}`
      : o.budgetMin != null
        ? `a partir de ${formatBRL(o.budgetMin)}`
        : o.budgetMax != null
          ? `até ${formatBRL(o.budgetMax)}`
          : null;

  return (
    <>
      <div className="opp-detail-head">
        <div className="opp-card-top">
          <span className="opp-type mono">{o.eventType}</span>
          {o.slots > 1 && <span className="opp-slots mono">{o.slots} vagas</span>}
          {o.status === "encerrada" && <span className="status-badge mono status-reembolsado">encerrada</span>}
        </div>
        <h1 style={{ marginTop: "0.4rem" }}>{o.eventType} · {o.eventLocation}</h1>
        <p className="opp-when mono">
          {o.eventDate}{o.eventTime ? ` às ${o.eventTime}` : ""} · por {o.clientName}
          {range ? ` · cachê ${range}` : ""}
        </p>
        <p className="opp-desc" style={{ marginTop: "0.8rem" }}>{o.description}</p>
      </div>

      {/* Profissional: candidatar ou ver status */}
      {viewerRole === "profissional" && (
        <div className="deal-box" style={{ marginTop: "1.4rem" }}>
          {myApplication ? (
            <div className="deal-action">
              <h2 className="section-title">
                {myApplication.status === "escolhida" ? "Você foi escolhido! 🎉" : "Candidatura enviada"}
              </h2>
              <p>
                {myApplication.status === "escolhida"
                  ? "A empresa te escolheu — confira suas conversas para combinar e receber o pagamento em custódia."
                  : "Sua candidatura está com a empresa. Se te escolherem, abre uma conversa com pagamento em custódia."}
              </p>
              {myApplication.proposedAmount ? (
                <p className="mono dim">seu valor: {formatBRL(myApplication.proposedAmount)}</p>
              ) : null}
              {myApplication.status === "escolhida" && (
                <Link href="/conversas" className="btn btn-sm">Minhas conversas</Link>
              )}
            </div>
          ) : o.status !== "aberta" ? (
            <p className="deal-wait mono">Esta vaga já foi encerrada.</p>
          ) : (
            <form className="deal-action" onSubmit={apply}>
              <h2 className="section-title">Candidatar-se</h2>
              <p>Conte por que você é a pessoa certa. Se quiser, informe seu valor — vira a proposta se te escolherem.</p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Sua experiência com esse tipo de evento, o que entrega, disponibilidade… (sem telefone/e-mail)"
                maxLength={800}
                style={{ minHeight: "5rem", width: "100%" }}
              />
              <input
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(maskCurrency(e.target.value).display)}
                placeholder="Seu valor (opcional) — R$ 0,00"
                style={{ marginTop: "0.6rem" }}
              />
              <button type="submit" className="btn" disabled={busy} style={{ marginTop: "0.7rem" }}>
                {busy ? "Enviando…" : "Enviar candidatura"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Dono: ver candidaturas e escolher */}
      {viewerRole === "dono" && (
        <div style={{ marginTop: "1.4rem" }}>
          <h2 className="section-title">Candidaturas ({applications.length})</h2>
          {applications.length === 0 ? (
            <div className="empty-state">
              <span className="mono">SEM_CANDIDATOS</span>
              Ainda ninguém se candidatou. Compartilhe a vaga com profissionais.
            </div>
          ) : (
            <div className="cand-list">
              {applications.map((a) => (
                <article key={a.id} className={`cand-card ${a.status === "escolhida" ? "chosen" : ""}`}>
                  <div className="cand-info">
                    <div className="cand-head">
                      <Link href={`/profissional/${a.professionalId}`} className="cand-name">
                        {a.professionalName}
                      </Link>
                      {a.pro?.verified && <span className="pro-badge verified">✓ verificado</span>}
                      {a.pro && a.pro.reviewCount > 0 && (
                        <span className="mono dim">★ {a.pro.rating.toFixed(1)}</span>
                      )}
                    </div>
                    {a.pro && (
                      <span className="mono dim">{typeLabel(a.pro.type as ProfessionalType)} · {a.pro.city}</span>
                    )}
                    <p className="cand-msg">{a.message}</p>
                    {a.proposedAmount ? (
                      <span className="mono cand-value">valor: {formatBRL(a.proposedAmount)}</span>
                    ) : null}
                  </div>
                  <div className="cand-action">
                    {a.status === "escolhida" ? (
                      <span className="status-badge mono status-concluido">escolhido ✓</span>
                    ) : o.status === "aberta" ? (
                      <button type="button" className="btn btn-sm" disabled={busy} onClick={() => choose(a.id)}>
                        Escolher
                      </button>
                    ) : (
                      <span className="mono dim">vaga encerrada</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {viewerRole === "outro" && (
        <p className="admin-lead" style={{ marginTop: "1.4rem", fontSize: "0.9rem" }}>
          <Link href="/entrar" style={{ textDecoration: "underline" }}>Entre como profissional</Link> para se candidatar a esta vaga.
        </p>
      )}

      {error && <div className="form-error" style={{ marginTop: "0.8rem" }}>{error}</div>}
    </>
  );
}
