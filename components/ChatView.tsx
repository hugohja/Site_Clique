"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Conversation, PublicProfessional } from "@/lib/types";
import { formatPrice, typeLabel } from "@/lib/format";

interface ConversationPayload {
  conversation: Omit<Conversation, "clientWhatsapp">;
  professional: PublicProfessional;
  contact: { professionalWhatsapp: string; clientWhatsapp: string } | null;
}

const STATUS_LABEL: Record<Conversation["status"], string> = {
  conversando: "conversando · contato oculto",
  proposta_enviada: "proposta enviada",
  proposta_aceita: "proposta aceita · aguardando pagamento",
  pagamento_confirmado: "pagamento confirmado",
  contato_liberado: "contato liberado",
};

function brl(value: number) {
  return `R$ ${value.toLocaleString("pt-BR")}`;
}

/**
 * Chat interno (fase de protótipo: sem websocket — polling leve + refetch
 * após cada ação já resolve pra validar o fluxo).
 *
 * O negócio inteiro fecha aqui: proposta estruturada → aceite → pagamento →
 * contato. Sem login ainda, o papel vem da URL: o cliente usa o link normal e
 * o profissional acessa o mesmo link com ?papel=profissional.
 */
export default function ChatView({ conversationId }: { conversationId: string }) {
  const searchParams = useSearchParams();
  const role = searchParams.get("papel") === "profissional" ? "profissional" : "cliente";

  const [data, setData] = useState<ConversationPayload | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [wasFiltered, setWasFiltered] = useState(false);
  const [proposalValue, setProposalValue] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/conversas/${conversationId}`, { cache: "no-store" });
    if (res.status === 404) {
      setNotFound(true);
      return;
    }
    if (res.ok) setData(await res.json());
  }, [conversationId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 7000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [data?.conversation.messages.length]);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    setWasFiltered(false);
    try {
      const res = await fetch(`/api/conversas/${conversationId}/mensagens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: role, text }),
      });
      const body = await res.json();
      if (res.ok) {
        setText("");
        setWasFiltered(Boolean(body.filtered));
        await load();
      }
    } finally {
      setSending(false);
    }
  }

  async function post(path: string, payload?: unknown) {
    setActionError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/conversas/${conversationId}${path}`, {
        method: "POST",
        headers: payload ? { "Content-Type": "application/json" } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(body.error ?? "Não foi possível concluir a ação.");
        return false;
      }
      await load();
      return true;
    } catch {
      setActionError("Falha de conexão. Tente de novo.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function sendProposal(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(proposalValue.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      setActionError("Informe um valor válido pra proposta.");
      return;
    }
    const ok = await post("/proposta", { amount: value });
    if (ok) setProposalValue("");
  }

  if (notFound) {
    return (
      <div className="container" style={{ paddingBlock: "4rem" }}>
        <div className="empty-state">
          <span className="mono">404_CHAT.ERR</span>
          Conversa não encontrada (os dados do protótipo são zerados quando o servidor reinicia).{" "}
          <Link href="/" style={{ textDecoration: "underline" }}>
            Voltar pra busca
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container" style={{ paddingBlock: "4rem" }}>
        <p className="mono" style={{ color: "var(--text-dim)" }}>
          carregando conversa…
        </p>
      </div>
    );
  }

  const { conversation, professional, contact } = data;
  const { status, proposal } = conversation;
  const released = status === "contato_liberado";
  const other = role === "cliente" ? professional.name : conversation.clientName;

  return (
    <div className="container chat-page">
      <nav className="breadcrumb mono">
        <Link href={`/profissional/${professional.id}`}>← perfil de {professional.name}</Link>
      </nav>

      <div className="chat-head">
        <div>
          <h1>{other}</h1>
          <p className="profile-sub">
            {role === "cliente" ? (
              <>
                <span className="pro-type mono">{typeLabel(professional.type)}</span>
                {professional.city} · a partir de {formatPrice(professional.priceFrom)}
              </>
            ) : (
              <>
                cliente · {conversation.eventType} · {conversation.eventDate}
              </>
            )}
          </p>
        </div>
        <span className={`status-badge mono status-${status}`}>{STATUS_LABEL[status]}</span>
      </div>

      {released && contact ? (
        <div className="contact-card">
          <h2 className="section-title">Contato liberado ✓</h2>
          <p className="contact-line mono">
            WhatsApp de {professional.name}:{" "}
            <a
              href={`https://wa.me/${contact.professionalWhatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              +{contact.professionalWhatsapp}
            </a>
          </p>
          <p className="contact-line mono">
            WhatsApp de {conversation.clientName}:{" "}
            <a
              href={`https://wa.me/${contact.clientWhatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              +{contact.clientWhatsapp}
            </a>
          </p>
          <div className="contact-logistics">
            <span className="mono">
              <span className="dim">evento</span> {conversation.eventType}
            </span>
            <span className="mono">
              <span className="dim">data</span> {conversation.eventDate}
            </span>
            <span className="mono">
              <span className="dim">local</span> {conversation.eventLocation}
            </span>
            <span className="mono">
              <span className="dim">cliente</span> {conversation.clientName}
            </span>
            {conversation.agreedPrice !== null && (
              <span className="mono">
                <span className="dim">valor fechado</span> {brl(conversation.agreedPrice)}
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="chat-privacy-note">
          O contato do profissional fica oculto até a confirmação do pagamento. Toda a negociação
          acontece aqui — telefone, links e redes sociais são censurados automaticamente nas
          mensagens, e o valor é fechado pela proposta abaixo.
        </p>
      )}

      <div className="chat-log" ref={logRef}>
        {conversation.messages.map((m) =>
          m.sender === "sistema" ? (
            <div key={m.id} className="bubble-system mono">
              {m.text}
            </div>
          ) : (
            <div key={m.id} className={`bubble ${m.sender === role ? "mine" : "theirs"}`}>
              <span className="bubble-sender mono">
                {m.sender === "cliente" ? conversation.clientName : professional.name}
              </span>
              <p>{m.text}</p>
              {m.filtered && (
                <span className="bubble-filtered mono">tentativa de contato removida</span>
              )}
            </div>
          )
        )}
      </div>

      {wasFiltered && (
        <p className="filter-warning mono">
          Sua última mensagem tinha dados de contato e foi censurada. Feche o valor pela proposta; o
          contato é liberado após o pagamento.
        </p>
      )}

      {!released && (
        <form className="chat-composer" onSubmit={sendMessage}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Mensagem como ${role === "cliente" ? conversation.clientName : professional.name}…`}
            aria-label="Mensagem"
            maxLength={2000}
          />
          <button type="submit" className="btn" disabled={sending || !text.trim()}>
            Enviar
          </button>
        </form>
      )}

      {/* ---- Negociação estruturada: proposta → aceite → pagamento ---- */}
      {!released && (
        <div className="deal-box">
          {/* Estado atual da proposta, visível pros dois lados */}
          {proposal && (
            <div className={`proposal-strip ${proposal.acceptedAt ? "accepted" : "pending"}`}>
              <span className="mono">
                <span className="dim">proposta</span> {brl(proposal.amount)}
              </span>
              <span className="mono proposal-state">
                {proposal.acceptedAt ? "aceita ✓" : "aguardando aceite do cliente"}
              </span>
            </div>
          )}

          {/* PROFISSIONAL: enviar/atualizar proposta (só antes do aceite) */}
          {role === "profissional" && (status === "conversando" || status === "proposta_enviada") && (
            <div className="deal-action">
              <h2 className="section-title">
                {status === "proposta_enviada" ? "Atualizar proposta" : "Enviar proposta de valor"}
              </h2>
              <p>
                Feche o valor por aqui. O cliente precisa aceitar dentro da plataforma antes do
                pagamento — é isso que mantém o negócio no Clica.
              </p>
              <form className="deal-form" onSubmit={sendProposal}>
                <input
                  value={proposalValue}
                  onChange={(e) => setProposalValue(e.target.value)}
                  inputMode="decimal"
                  placeholder="Valor da proposta (R$)"
                  aria-label="Valor da proposta em reais"
                />
                <button type="submit" className="btn" disabled={busy}>
                  {busy ? "Enviando…" : status === "proposta_enviada" ? "Reenviar" : "Enviar proposta"}
                </button>
              </form>
            </div>
          )}

          {/* PROFISSIONAL aguardando */}
          {role === "profissional" && status === "conversando" && !proposal && null}
          {role === "profissional" && status === "proposta_aceita" && (
            <div className="deal-action">
              <p className="deal-wait mono">
                Proposta aceita. Aguardando o cliente confirmar o pagamento pra liberar o contato.
              </p>
            </div>
          )}

          {/* CLIENTE: aceitar proposta */}
          {role === "cliente" && status === "proposta_enviada" && proposal && (
            <div className="deal-action">
              <h2 className="section-title">Proposta recebida</h2>
              <p>
                {professional.name} propôs <strong>{brl(proposal.amount)}</strong>. Aceite pra
                liberar o pagamento. O contato só aparece depois que o pagamento for confirmado.
              </p>
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => post("/proposta/aceitar")}
              >
                {busy ? "Registrando…" : `Aceitar proposta de ${brl(proposal.amount)}`}
              </button>
            </div>
          )}

          {/* CLIENTE aguardando proposta */}
          {role === "cliente" && status === "conversando" && (
            <p className="deal-wait mono">
              Aguardando {professional.name} enviar a proposta de valor.
            </p>
          )}

          {/* CLIENTE: pagar (só existe após proposta aceita) */}
          {role === "cliente" && status === "proposta_aceita" && proposal && (
            <div className="deal-action pay">
              <h2 className="section-title">Pagamento</h2>
              <p>
                Você aceitou <strong>{brl(proposal.amount)}</strong>. Confirme o pagamento pra
                liberar o WhatsApp e a logística pros dois lados.{" "}
                <span className="mono">(fase de teste: pagamento simulado)</span>
              </p>
              <button
                type="button"
                className="btn btn-coral"
                disabled={busy}
                onClick={() => post("/pagamento")}
              >
                {busy ? "Processando…" : `Simular pagamento de ${brl(proposal.amount)}`}
              </button>
            </div>
          )}

          {actionError && (
            <div className="form-error" style={{ marginTop: "0.7rem" }}>
              {actionError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
