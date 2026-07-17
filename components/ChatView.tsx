"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Conversation, PublicProfessional } from "@/lib/types";
import { formatPrice, typeLabel } from "@/lib/format";

interface ConversationPayload {
  conversation: Conversation;
  professional: PublicProfessional;
  contact: { whatsapp: string } | null;
}

const STATUS_LABEL: Record<Conversation["status"], string> = {
  conversando: "conversando · contato oculto",
  pagamento_confirmado: "pagamento confirmado",
  contato_liberado: "contato liberado",
};

/**
 * Chat interno (fase de protótipo: sem websocket — polling leve + refetch
 * após cada envio já resolve pra validar o fluxo).
 *
 * Sem login ainda, o papel vem da URL: o cliente usa o link normal e o
 * profissional acessa o mesmo link com ?papel=profissional.
 */
export default function ChatView({ conversationId }: { conversationId: string }) {
  const searchParams = useSearchParams();
  const role = searchParams.get("papel") === "profissional" ? "profissional" : "cliente";

  const [data, setData] = useState<ConversationPayload | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [wasFiltered, setWasFiltered] = useState(false);
  const [payValue, setPayValue] = useState("");
  const [payError, setPayError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
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

  async function simulatePayment(event: React.FormEvent) {
    event.preventDefault();
    setPayError(null);
    const value = Number(payValue.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      setPayError("Informe o valor fechado com o profissional.");
      return;
    }
    setPaying(true);
    try {
      const res = await fetch(`/api/conversas/${conversationId}/pagamento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agreedPrice: value }),
      });
      const body = await res.json();
      if (!res.ok) {
        setPayError(body.error ?? "Não foi possível confirmar o pagamento.");
        return;
      }
      await load();
    } finally {
      setPaying(false);
    }
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
  const released = conversation.status === "contato_liberado";
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
        <span className={`status-badge mono status-${conversation.status}`}>
          {STATUS_LABEL[conversation.status]}
        </span>
      </div>

      {released && contact ? (
        <div className="contact-card">
          <h2 className="section-title">Contato liberado ✓</h2>
          <p className="contact-line mono">
            WhatsApp de {professional.name}:{" "}
            <a
              href={`https://wa.me/${contact.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              +{contact.whatsapp}
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
                <span className="dim">valor fechado</span> R${" "}
                {conversation.agreedPrice.toLocaleString("pt-BR")}
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="chat-privacy-note">
          O contato do profissional fica oculto até a confirmação do pagamento. Combine tudo por
          aqui — telefone, links e redes sociais são censurados automaticamente nas mensagens.
        </p>
      )}

      <div className="chat-log" ref={logRef}>
        {conversation.messages.map((m) => (
          <div key={m.id} className={`bubble ${m.sender === role ? "mine" : "theirs"}`}>
            <span className="bubble-sender mono">
              {m.sender === "cliente" ? conversation.clientName : professional.name}
            </span>
            <p>{m.text}</p>
            {m.filtered && (
              <span className="bubble-filtered mono">tentativa de contato removida</span>
            )}
          </div>
        ))}
      </div>

      {wasFiltered && (
        <p className="filter-warning mono">
          Sua última mensagem tinha dados de contato e foi censurada. O contato é liberado após o
          pagamento.
        </p>
      )}

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

      {!released && role === "cliente" && (
        <div className="payment-box">
          <h2 className="section-title">Fechou com {professional.name}?</h2>
          <p>
            Confirme o valor combinado pra liberar o contato direto e os dados de logística pros
            dois lados. <span className="mono">(fase de teste: pagamento simulado)</span>
          </p>
          <form className="payment-form" onSubmit={simulatePayment}>
            <input
              value={payValue}
              onChange={(e) => setPayValue(e.target.value)}
              inputMode="decimal"
              placeholder="Valor fechado (R$)"
              aria-label="Valor fechado em reais"
            />
            <button type="submit" className="btn btn-coral" disabled={paying}>
              {paying ? "Confirmando…" : "Simular pagamento"}
            </button>
          </form>
          {payError && <div className="form-error" style={{ marginTop: "0.7rem" }}>{payError}</div>}
        </div>
      )}
    </div>
  );
}
