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
  review: { rating: number; comment: string } | null;
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
  cancelado: "cancelado",
};

const brl = formatBRL;

/** Palavra que acompanha a nota escolhida no formulário de avaliação. */
const RATING_WORDS: Record<number, string> = {
  1: "Ruim",
  2: "Regular",
  3: "Bom",
  4: "Muito bom",
  5: "Excelente",
};

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
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
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
  const closed = status === "concluido" || status === "reembolsado" || status === "cancelado";
  const cancelable = [
    "conversando",
    "proposta_enviada",
    "proposta_aceita",
    "pagamento_confirmado",
    "contato_liberado",
  ].includes(status);
  const other = role === "profissional" ? conversation.clientName : professional.name;

  const price = conversation.agreedPrice ?? proposal?.amount ?? 0;
  const commission = commissionAmount(price, conversation.commissionRate);
  const payout = payoutAmount(price, conversation.commissionRate);
  // Quem fez a proposta vigente espera resposta; o outro lado aceita/contrapropõe.
  const isProposer = proposal ? proposal.by === role : false;

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

          {data.review ? (
            <div className="review-done">
              <span className="review-stars-static" aria-label={`${data.review.rating} de 5`}>
                {"★".repeat(data.review.rating)}
                <span className="review-stars-empty">{"★".repeat(5 - data.review.rating)}</span>
              </span>
              {data.review.comment && <p className="review-comment">“{data.review.comment}”</p>}
              <span className="mono dim">
                {role === "cliente" ? "sua avaliação" : `avaliação de ${conversation.clientName}`}
              </span>
            </div>
          ) : role === "cliente" ? (
            <form
              className="review-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (reviewStars < 1) {
                  setActionError("Escolha de 1 a 5 estrelas.");
                  return;
                }
                post("/avaliar", { rating: reviewStars, comment: reviewComment }).then((ok) => {
                  if (ok) {
                    setReviewStars(0);
                    setReviewComment("");
                  }
                });
              }}
            >
              <h3 className="review-title">Como foi o serviço de {professional.name}?</h3>
              <div className="review-rate">
                <div className="review-stars" role="radiogroup" aria-label="Nota">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      type="button"
                      key={n}
                      className={`review-star ${n <= reviewStars ? "on" : ""}`}
                      aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
                      aria-pressed={n === reviewStars}
                      onClick={() => setReviewStars(n)}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <span className="review-hint mono">
                  {reviewStars > 0 ? RATING_WORDS[reviewStars] : "toque nas estrelas"}
                </span>
              </div>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Conte como foi (opcional): pontualidade, qualidade, atendimento…"
                maxLength={600}
              />
              <button type="submit" className="btn btn-sm" disabled={busy || reviewStars < 1}>
                {busy ? "Enviando…" : "Enviar avaliação"}
              </button>
            </form>
          ) : (
            <p className="mono dim" style={{ marginTop: "0.6rem" }}>
              Aguardando a avaliação do cliente.
            </p>
          )}
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
      {status === "cancelado" && (
        <div className="escrow-box">
          <h2 className="section-title">Contratação cancelada</h2>
          <p>Esta contratação foi cancelada. Se precisar, é só começar uma nova conversa.</p>
        </div>
      )}

      {/* ---- Negociação: proposta ⇄ contraproposta → aceite → pagamento ---- */}
      {negotiating && (
        <div className="deal-box">
          {proposal && (
            <div className={`proposal-strip ${proposal.acceptedAt ? "accepted" : "pending"}`}>
              <span className="mono"><span className="dim">proposta</span> {brl(proposal.amount)}</span>
              <span className="mono proposal-state">
                {proposal.acceptedAt
                  ? "aceita ✓"
                  : `por ${proposal.by === "profissional" ? professional.name : conversation.clientName}`}
              </span>
            </div>
          )}

          {/* Primeiro orçamento — só o profissional abre, ainda conversando */}
          {role === "profissional" && status === "conversando" && (
            <div className="deal-action">
              <h2 className="section-title">Enviar orçamento</h2>
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
                  {busy ? "Enviando…" : "Enviar orçamento"}
                </button>
              </form>
            </div>
          )}

          {role === "cliente" && status === "conversando" && (
            <p className="deal-wait mono">Aguardando {professional.name} enviar o orçamento.</p>
          )}

          {/* Sua vez de responder: você NÃO fez a proposta atual → aceita ou contrapropõe */}
          {status === "proposta_enviada" && proposal && !isProposer && (
            <div className="deal-action">
              <h2 className="section-title">
                {proposal.by === "profissional" ? "Orçamento recebido" : "Contraproposta recebida"}
              </h2>
              <p>
                {proposal.by === "profissional" ? professional.name : conversation.clientName} propôs{" "}
                <strong>{brl(proposal.amount)}</strong>. Aceite, ou responda com outro valor.
                {role === "cliente" ? " O contato aparece depois que você paga." : ""}
              </p>
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => post("/proposta/aceitar")}
              >
                {busy ? "Registrando…" : `Aceitar ${brl(proposal.amount)}`}
              </button>
              <form className="deal-form deal-counter" onSubmit={sendProposal}>
                <input
                  value={proposalValue}
                  onChange={(e) => setProposalValue(maskCurrency(e.target.value).display)}
                  inputMode="numeric"
                  placeholder="Contraproposta R$ 0,00"
                  aria-label="Valor da contraproposta em reais"
                />
                <button type="submit" className="btn btn-ghost" disabled={busy}>
                  {busy ? "Enviando…" : "Contrapropor"}
                </button>
              </form>
            </div>
          )}

          {/* Você fez a proposta atual — aguardando a resposta do outro lado */}
          {status === "proposta_enviada" && proposal && isProposer && (
            <div className="deal-action">
              <p className="deal-wait mono">
                Proposta de {brl(proposal.amount)} enviada. Aguardando a resposta de{" "}
                {role === "profissional" ? conversation.clientName : professional.name}.
              </p>
              <details className="deal-update">
                <summary className="mono">Alterar minha proposta</summary>
                <form className="deal-form" onSubmit={sendProposal}>
                  <input
                    value={proposalValue}
                    onChange={(e) => setProposalValue(maskCurrency(e.target.value).display)}
                    inputMode="numeric"
                    placeholder="R$ 0,00"
                    aria-label="Novo valor da proposta em reais"
                  />
                  <button type="submit" className="btn btn-ghost" disabled={busy}>
                    {busy ? "Enviando…" : "Atualizar"}
                  </button>
                </form>
              </details>
            </div>
          )}

          {role === "profissional" && status === "proposta_aceita" && (
            <p className="deal-wait mono">Proposta aceita. Aguardando o cliente pagar.</p>
          )}

          {role === "cliente" && status === "proposta_aceita" && proposal && (
            <div className="deal-action pay">
              <h2 className="section-title">Pagamento em custódia</h2>
              <p>
                Você fechou <strong>{brl(proposal.amount)}</strong>. Ao pagar, a Clique <strong>segura
                o valor</strong> e libera o contato. O dinheiro só vai pro profissional quando você
                confirmar (com o código) que ele compareceu.
              </p>
              <Link href={`/conversa/${conversationId}/pagamento`} className="btn btn-coral">
                {`Pagar ${brl(proposal.amount)} em custódia`}
              </Link>
            </div>
          )}
        </div>
      )}

      {cancelable && (role === "cliente" || role === "profissional") && (
        <div className="cancel-row">
          <button
            type="button"
            className="btn-cancel-link"
            disabled={busy}
            onClick={() => {
              const withMoney = status === "pagamento_confirmado" || status === "contato_liberado";
              const msg = withMoney
                ? "Cancelar esta contratação? Como já houve pagamento, a Clique vai analisar o reembolso."
                : "Cancelar esta contratação? Isso encerra a negociação.";
              if (confirm(msg)) post("/cancelar");
            }}
          >
            Cancelar contratação
          </button>
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
