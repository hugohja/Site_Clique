"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Conversation, PublicProfessional } from "@/lib/types";
import { commissionAmount, payoutAmount } from "@/lib/types";
import { formatBRL, maskCurrency, typeLabel } from "@/lib/format";

interface ConversationPayload {
  viewerRole: "cliente" | "profissional" | "admin";
  conversation: Omit<Conversation, "clientWhatsapp">;
  professional: PublicProfessional;
  contact: { professionalWhatsapp: string; clientWhatsapp: string } | null;
}

const STATUS_LABEL: Record<Conversation["status"], string> = {
  conversando: "conversando · contato oculto",
  proposta_enviada: "proposta enviada",
  proposta_aceita: "aceita · aguardando pagamento",
  pagamento_confirmado: "pago",
  contato_liberado: "pago · em custódia",
  concluido: "concluído",
  em_disputa: "em disputa",
  reembolsado: "reembolsado",
};

const brl = formatBRL;

/**
 * Chat interno + custódia (escrow). O papel de quem vê vem da SESSÃO (o servidor
 * decide se é o cliente ou o profissional daquela conversa). Fluxo: proposta →
 * aceite → pagamento (em custódia) → o profissional digita o código do cliente
 * no evento → pagamento liberado; ou o cliente reporta não comparecimento.
 */
export default function ChatView({ conversationId }: { conversationId: string }) {
  const [data, setData] = useState<ConversationPayload | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [denied, setDenied] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [wasFiltered, setWasFiltered] = useState(false);
  const [proposalValue, setProposalValue] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/conversas/${conversationId}`, { cache: "no-store" });
    if (res.status === 404) return setNotFound(true);
    if (res.status === 403) return setDenied(true);
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
        body: JSON.stringify({ text }),
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
    const { reais } = maskCurrency(proposalValue);
    if (!Number.isFinite(reais) || reais <= 0) {
      setActionError("Informe um valor válido pra proposta.");
      return;
    }
    if (await post("/proposta", { amount: reais })) setProposalValue("");
  }

  if (notFound || denied) {
    return (
      <div className="container" style={{ paddingBlock: "4rem" }}>
        <div className="empty-state">
          <span className="mono">{denied ? "403_CHAT" : "404_CHAT"}</span>
          {denied
            ? "Esta conversa é de outra conta. Entre com a conta certa para vê-la."
            : "Conversa não encontrada."}{" "}
          <Link href="/conversas" style={{ textDecoration: "underline" }}>
            minhas conversas
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

  const { conversation, professional, contact, viewerRole: role } = data;
  const { status, proposal } = conversation;
  const paid = ["contato_liberado", "concluido", "em_disputa", "reembolsado"].includes(status);
  const awaitingConfirmation = status === "pagamento_confirmado";
  const inCustody = status === "contato_liberado";
  const negotiating = ["conversando", "proposta_enviada", "proposta_aceita"].includes(status);
  const closed = status === "concluido" || status === "reembolsado";
  const other = role === "profissional" ? conversation.clientName : professional.name;

  const price = conversation.agreedPrice ?? proposal?.amount ?? 0;
  const commission = commissionAmount(price, conversation.commissionRate);
  const payout = payoutAmount(price, conversation.commissionRate);

  return (
    <div className="container chat-page">
      <nav className="breadcrumb mono">
        <Link href="/conversas">← minhas conversas</Link>
      </nav>

      <div className="chat-head">
        <div>
          <h1>{other}</h1>
          <p className="profile-sub">
            {role === "profissional" ? (
              <>
                cliente · {conversation.eventType} · {conversation.eventDate}
                {conversation.eventTime ? ` às ${conversation.eventTime}` : ""}
              </>
            ) : (
              <>
                <span className="pro-type mono">{typeLabel(professional.type)}</span>
                {professional.city}
              </>
            )}
          </p>
        </div>
        <span className={`status-badge mono status-${status}`}>{STATUS_LABEL[status]}</span>
      </div>

      {paid && contact && (
        <div className="contact-card">
          <h2 className="section-title">Contato liberado ✓</h2>
          <p className="contact-line mono">
            WhatsApp de {professional.name}:{" "}
            <a href={`https://wa.me/${contact.professionalWhatsapp}`} target="_blank" rel="noopener noreferrer">
              +{contact.professionalWhatsapp}
            </a>
          </p>
          <p className="contact-line mono">
            WhatsApp de {conversation.clientName}:{" "}
            <a href={`https://wa.me/${contact.clientWhatsapp}`} target="_blank" rel="noopener noreferrer">
              +{contact.clientWhatsapp}
            </a>
          </p>
          <div className="contact-logistics">
            <span className="mono"><span className="dim">evento</span> {conversation.eventType}</span>
            <span className="mono">
              <span className="dim">data</span> {conversation.eventDate}
              {conversation.eventTime ? ` às ${conversation.eventTime}` : ""}
            </span>
            <span className="mono"><span className="dim">local</span> {conversation.eventLocation}</span>
            {price > 0 && <span className="mono"><span className="dim">valor</span> {brl(price)}</span>}
          </div>
        </div>
      )}

      <div className="chat-log" ref={logRef}>
        {conversation.messages.map((m) =>
          m.sender === "sistema" ? (
            <div key={m.id} className="bubble-system mono">{m.text}</div>
          ) : (
            <div key={m.id} className={`bubble ${m.sender === role ? "mine" : "theirs"}`}>
              <span className="bubble-sender mono">
                {m.sender === "cliente" ? conversation.clientName : professional.name}
              </span>
              <p>{m.text}</p>
              {m.filtered && <span className="bubble-filtered mono">tentativa de contato removida</span>}
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

      {!closed && (role === "cliente" || role === "profissional") && (
        <form className="chat-composer" onSubmit={sendMessage}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Mensagem como ${role}…`}
            aria-label="Mensagem"
            maxLength={2000}
          />
          <button type="submit" className="btn" disabled={sending || !text.trim()}>
            Enviar
          </button>
        </form>
      )}

      {/* ---- Custódia: código (cliente) / concluir (profissional) / disputa ---- */}
      {inCustody && role === "cliente" && (
        <div className="escrow-box">
          <h2 className="section-title">Seu código de confirmação</h2>
          <p>
            O pagamento está <strong>em custódia</strong> com a Clique. Quando o profissional chegar ao
            evento, passe este código pra ele — só então o valor é liberado. É a sua garantia.
          </p>
          <div className="escrow-code mono">{conversation.confirmationCode}</div>
          <p className="escrow-warn mono">Não passe o código antes de o profissional aparecer.</p>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={busy}
            onClick={() => {
              if (confirm("Reportar que o profissional NÃO compareceu? A Clique vai analisar e pode reembolsar você.")) {
                post("/disputa");
              }
            }}
          >
            Profissional não compareceu
          </button>
        </div>
      )}

      {inCustody && role === "profissional" && (
        <div className="escrow-box">
          <h2 className="section-title">Concluir e receber</h2>
          <p>
            No evento, peça ao cliente o <strong>código de 4 dígitos</strong> e digite aqui pra liberar
            seu pagamento. Você recebe <strong>{brl(payout)}</strong> (valor {brl(price)} menos a
            comissão da Clique de {brl(commission)}).
          </p>
          <form
            className="deal-form"
            onSubmit={(e) => {
              e.preventDefault();
              post("/concluir", { code: codeInput });
            }}
          >
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              placeholder="código do cliente"
              aria-label="Código de confirmação"
            />
            <button type="submit" className="btn" disabled={busy || codeInput.length !== 4}>
              {busy ? "Validando…" : "Validar e concluir"}
            </button>
          </form>
        </div>
      )}

      {awaitingConfirmation && (
        <div className="escrow-box">
          <h2 className="section-title">Pagamento em conferência</h2>
          {role === "cliente" ? (
            <p>
              Você informou o PIX de <strong>{brl(price)}</strong>. A Clique está conferindo o
              recebimento — assim que confirmar, o contato é liberado e você recebe o código de
              custódia. Leva pouco tempo.
            </p>
          ) : (
            <p>
              O cliente informou o pagamento de <strong>{brl(price)}</strong>. A Clique está
              conferindo o recebimento; quando confirmar, o contato é liberado.
            </p>
          )}
        </div>
      )}

      {status === "concluido" && (
        <div className="escrow-box done">
          <h2 className="section-title">Serviço concluído ✓</h2>
          <p className="mono">
            valor {brl(price)} · comissão Clique {brl(commission)} · profissional recebe {brl(payout)}
          </p>
        </div>
      )}
      {status === "em_disputa" && (
        <div className="escrow-box">
          <h2 className="section-title">Em análise pela Clique</h2>
          <p>
            O cliente reportou não comparecimento. O dinheiro segue em custódia enquanto a Clique
            analisa; se confirmado, o cliente é reembolsado e a nota do profissional cai.
          </p>
        </div>
      )}
      {status === "reembolsado" && (
        <div className="escrow-box">
          <h2 className="section-title">Reembolsado ao cliente</h2>
          <p>O valor foi devolvido. Esta contratação foi encerrada.</p>
        </div>
      )}

      {/* ---- Negociação: proposta → aceite → pagamento ---- */}
      {negotiating && (
        <div className="deal-box">
          {proposal && (
            <div className={`proposal-strip ${proposal.acceptedAt ? "accepted" : "pending"}`}>
              <span className="mono"><span className="dim">proposta</span> {brl(proposal.amount)}</span>
              <span className="mono proposal-state">
                {proposal.acceptedAt ? "aceita ✓" : "aguardando aceite do cliente"}
              </span>
            </div>
          )}

          {role === "profissional" && (status === "conversando" || status === "proposta_enviada") && (
            <div className="deal-action">
              <h2 className="section-title">
                {status === "proposta_enviada" ? "Atualizar proposta" : "Enviar orçamento"}
              </h2>
              <p>
                Mande o valor por aqui. O cliente aceita e paga dentro da plataforma — o dinheiro fica
                em custódia até você concluir o serviço. É isso que garante o recebimento.
              </p>
              <form className="deal-form" onSubmit={sendProposal}>
                <input
                  value={proposalValue}
                  onChange={(e) => setProposalValue(maskCurrency(e.target.value).display)}
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  aria-label="Valor do orçamento em reais"
                />
                <button type="submit" className="btn" disabled={busy}>
                  {busy ? "Enviando…" : status === "proposta_enviada" ? "Reenviar" : "Enviar orçamento"}
                </button>
              </form>
            </div>
          )}

          {role === "profissional" && status === "proposta_aceita" && (
            <p className="deal-wait mono">Proposta aceita. Aguardando o cliente pagar.</p>
          )}

          {role === "cliente" && status === "proposta_enviada" && proposal && (
            <div className="deal-action">
              <h2 className="section-title">Orçamento recebido</h2>
              <p>
                {professional.name} propôs <strong>{brl(proposal.amount)}</strong>. Aceite para liberar
                o pagamento (o contato aparece depois que você paga).
              </p>
              <button type="button" className="btn" disabled={busy} onClick={() => post("/proposta/aceitar")}>
                {busy ? "Registrando…" : `Aceitar ${brl(proposal.amount)}`}
              </button>
            </div>
          )}

          {role === "cliente" && status === "conversando" && (
            <p className="deal-wait mono">Aguardando {professional.name} enviar o orçamento.</p>
          )}

          {role === "cliente" && status === "proposta_aceita" && proposal && (
            <div className="deal-action pay">
              <h2 className="section-title">Pagamento em custódia</h2>
              <p>
                Você aceitou <strong>{brl(proposal.amount)}</strong>. Ao pagar, a Clique <strong>segura
                o valor</strong> e libera o contato. O dinheiro só vai pro profissional quando você
                confirmar (com o código) que ele compareceu.{" "}
                <span className="mono">(fase de teste: pagamento simulado)</span>
              </p>
              <Link href={`/conversa/${conversationId}/pagamento`} className="btn btn-coral">
                {`Pagar ${brl(proposal.amount)} em custódia`}
              </Link>
            </div>
          )}
        </div>
      )}

      {actionError && (
        <div className="form-error" style={{ marginTop: "0.7rem" }}>
          {actionError}
        </div>
      )}
    </div>
  );
}
