"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Conversation, PublicProfessional } from "@/lib/types";
import { formatBRL, typeLabel } from "@/lib/format";

interface Payload {
  viewerRole: "cliente" | "profissional" | "admin";
  conversation: Omit<Conversation, "clientWhatsapp">;
  professional: PublicProfessional;
}

const brl = formatBRL;

/** Segundos → "M:SS" pra contagem regressiva do PIX. */
function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Checkout da custódia (fase de teste: pagamento SIMULADO). Só o cliente da
 * conversa, com a proposta aceita, pode pagar. Ao confirmar, chama a rota de
 * pagamento (que segura o valor e libera o contato) e volta pra conversa.
 */
interface PixCharge {
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl: string;
  expiresAt: string;
}

export default function CheckoutView({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound" | "denied">("loading");
  const [pixEnabled, setPixEnabled] = useState(false);
  const [manualPixKey, setManualPixKey] = useState("");
  const [pixCharge, setPixCharge] = useState<PixCharge | null>(null);
  const [attempt, setAttempt] = useState(1);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expired = remaining === 0;

  // Contagem regressiva até o PIX expirar (30 min). Zera quando um novo é gerado.
  useEffect(() => {
    if (!pixCharge?.expiresAt) {
      setRemaining(null);
      return;
    }
    const target = Date.parse(pixCharge.expiresAt);
    if (Number.isNaN(target)) {
      setRemaining(null);
      return;
    }
    const tick = () => setRemaining(Math.max(0, Math.round((target - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [pixCharge?.expiresAt]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/conversas/${conversationId}`, { cache: "no-store" });
    if (res.status === 404) return setState("notfound");
    if (res.status === 403) return setState("denied");
    if (res.ok) {
      setData(await res.json());
      setState("ready");
    }
  }, [conversationId]);

  useEffect(() => {
    load();
    fetch("/api/pagamento/config")
      .then((r) => r.json())
      .then((c) => {
        setPixEnabled(Boolean(c.pixEnabled));
        setManualPixKey(c.manualPixKey ?? "");
      })
      .catch(() => setPixEnabled(false));
  }, [load]);

  // PIX real: o pagamento é externo. Consultamos o Mercado Pago direto (pelo id
  // da conversa) enquanto o cliente está no checkout — assim, no instante em que
  // o PIX é aprovado, o contato é liberado e a tela avança sozinha, sem depender
  // do webhook. Roda mesmo antes de gerar o QR e sobrevive a um reload da página.
  const convStatus = data?.conversation.status;
  useEffect(() => {
    if (!pixEnabled) return;
    if (data?.viewerRole !== "cliente" || convStatus !== "proposta_aceita") return;
    const timer = setInterval(async () => {
      const res = await fetch(`/api/conversas/${conversationId}/pagamento/pix/status`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const body = await res.json().catch(() => ({}));
      if (body?.paid) {
        clearInterval(timer);
        router.push(`/conversa/${conversationId}`);
        router.refresh();
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [pixEnabled, data?.viewerRole, convStatus, conversationId, router]);

  // Simulação (sem Mercado Pago): confirma na hora e volta pra conversa.
  async function paySimulado() {
    setError(null);
    setPaying(true);
    try {
      const res = await fetch(`/api/conversas/${conversationId}/pagamento`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Não foi possível concluir o pagamento.");
        return;
      }
      router.push(`/conversa/${conversationId}`);
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setPaying(false);
    }
  }

  // PIX real: gera a cobrança no Mercado Pago e mostra o QR / copia e cola.
  async function payPix(att = attempt) {
    setError(null);
    setPaying(true);
    try {
      const res = await fetch(`/api/conversas/${conversationId}/pagamento/pix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attempt: att }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Não foi possível gerar o PIX.");
        return;
      }
      setPixCharge({
        qrCode: body.qrCode,
        qrCodeBase64: body.qrCodeBase64,
        ticketUrl: body.ticketUrl,
        expiresAt: body.expiresAt ?? "",
      });
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setPaying(false);
    }
  }

  // PIX expirou: gera outro (nova tentativa → cobrança nova no Mercado Pago).
  function regeneratePix() {
    const next = attempt + 1;
    setAttempt(next);
    setPixCharge(null);
    setRemaining(null);
    payPix(next);
  }

  function pay() {
    return pixEnabled ? payPix() : paySimulado();
  }

  async function copyText(value: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponível — o usuário copia manualmente */
    }
  }

  if (state === "loading") {
    return (
      <div className="container" style={{ paddingBlock: "4rem" }}>
        <p className="mono" style={{ color: "var(--text-dim)" }}>
          carregando checkout…
        </p>
      </div>
    );
  }

  if (state === "notfound" || state === "denied") {
    return (
      <div className="container" style={{ paddingBlock: "4rem" }}>
        <div className="empty-state">
          <span className="mono">{state === "denied" ? "403_CHECKOUT" : "404_CHECKOUT"}</span>
          {state === "denied"
            ? "Este pagamento é de outra conta."
            : "Conversa não encontrada."}{" "}
          <Link href="/conversas" style={{ textDecoration: "underline" }}>
            minhas conversas
          </Link>
        </div>
      </div>
    );
  }

  const { conversation, professional, viewerRole } = data!;
  const price = conversation.proposal?.amount ?? conversation.agreedPrice ?? 0;

  // Só o cliente paga, e só quando a proposta foi aceita.
  if (viewerRole !== "cliente" || conversation.status !== "proposta_aceita" || price <= 0) {
    const informed = conversation.status === "pagamento_confirmado";
    const alreadyPaid = ["contato_liberado", "concluido", "em_disputa", "reembolsado"].includes(
      conversation.status
    );
    return (
      <div className="container" style={{ paddingBlock: "4rem" }}>
        <div className="empty-state">
          <span className="mono">CHECKOUT_INDISPONIVEL</span>
          {informed
            ? "Você já informou o pagamento. A Clique está conferindo o recebimento."
            : alreadyPaid
              ? "Este pagamento já foi feito."
              : "O pagamento só fica disponível depois que você aceita a proposta."}{" "}
          <Link href={`/conversa/${conversationId}`} style={{ textDecoration: "underline" }}>
            voltar à conversa
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container checkout">
      <nav className="breadcrumb mono">
        <Link href={`/conversa/${conversationId}`}>← voltar à conversa</Link>
      </nav>

      <div className="checkout-grid">
        <section className="checkout-main">
          <span className="checkout-badge mono">🔒 pagamento protegido</span>
          <h1>Pagar em custódia</h1>
          <p className="checkout-lead">
            Seu dinheiro fica com a Clique e <strong>só é liberado ao profissional</strong> quando
            você confirmar, com o código, que ele compareceu ao evento. Se não aparecer, você é
            reembolsado.
          </p>

          <div className="checkout-method">
            <span className="field-label">Forma de pagamento</span>

            {pixEnabled ? (
              // PIX real (Mercado Pago).
              <>
                <div className="method-options">
                  <button type="button" className="method-chip on" aria-pressed>
                    <b>PIX</b>
                    <span className="mono">aprovação na hora</span>
                  </button>
                </div>
                {pixCharge && expired ? (
                  <div className="method-body">
                    <div className="pix-expired">
                      <p className="pix-expired-title mono">⏱ PIX expirado</p>
                      <p className="form-hint">
                        Esse código passou dos 30 minutos e não vale mais. Gere um novo pra continuar
                        — o valor é o mesmo.
                      </p>
                      <button
                        type="button"
                        className="btn btn-coral"
                        disabled={paying}
                        onClick={regeneratePix}
                      >
                        {paying ? "Gerando…" : "Gerar novo PIX"}
                      </button>
                    </div>
                  </div>
                ) : pixCharge ? (
                  <div className="method-body">
                    <div className="pix-real">
                      {pixCharge.qrCodeBase64 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className="pix-qr-img"
                          src={`data:image/png;base64,${pixCharge.qrCodeBase64}`}
                          alt="QR Code do PIX"
                        />
                      ) : null}
                      <div className="pix-real-info">
                        <p className="mono">Escaneie o QR no app do seu banco, ou use o copia e cola:</p>
                        <code className="pix-code mono">{pixCharge.qrCode}</code>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => copyText(pixCharge.qrCode)}
                        >
                          {copied ? "Copiado ✓" : "Copiar código PIX"}
                        </button>
                      </div>
                    </div>
                    {remaining !== null && (
                      <p className={`pix-timer mono ${remaining <= 60 ? "warn" : ""}`}>
                        ⏱ Expira em {mmss(remaining)}
                      </p>
                    )}
                    <p className="pix-waiting mono">⏳ Aguardando a confirmação do pagamento…</p>
                    <p className="form-hint">
                      Assim que o PIX cair, o contato é liberado automaticamente — esta tela avança
                      sozinha.
                    </p>
                  </div>
                ) : (
                  <div className="method-body">
                    <p className="form-hint">
                      Clique em pagar pra gerar o PIX. Você tem 30 minutos pra pagar; depois disso é só
                      gerar outro. O valor fica em custódia da Clique até você confirmar o serviço.
                    </p>
                  </div>
                )}
              </>
            ) : (
              // Cobrança MANUAL: PIX na chave fixa da Clique; a Clique confere depois.
              <>
                <div className="method-options">
                  <button type="button" className="method-chip on" aria-pressed>
                    <b>PIX</b>
                    <span className="mono">chave da Clique</span>
                  </button>
                </div>
                <div className="method-body">
                  {manualPixKey ? (
                    <>
                      <div className="pix-real">
                        <div className="pix-real-info">
                          <p className="mono">
                            Faça um PIX de <strong>{brl(price)}</strong> para a chave da Clique:
                          </p>
                          <code className="pix-code mono">{manualPixKey}</code>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={() => copyText(manualPixKey)}
                          >
                            {copied ? "Copiado ✓" : "Copiar chave PIX"}
                          </button>
                        </div>
                      </div>
                      <p className="form-hint">
                        Depois de pagar, clique em <strong>“Já fiz o PIX”</strong>. A Clique confere o
                        recebimento e libera o contato — você recebe o código de custódia.
                      </p>
                    </>
                  ) : (
                    <p className="form-hint">
                      O meio de pagamento está sendo configurado. Tente novamente em instantes ou fale
                      com o suporte.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <ol className="custody-steps">
            <li>
              <span className="mono">1</span> Você paga e a Clique <b>segura o valor</b> (custódia).
            </li>
            <li>
              <span className="mono">2</span> O contato é liberado e vocês combinam o evento.
            </li>
            <li>
              <span className="mono">3</span> No dia, você passa o <b>código</b> ao profissional — só aí
              o pagamento é liberado a ele.
            </li>
          </ol>
        </section>

        <aside className="checkout-summary">
          <h2 className="section-title">Resumo</h2>
          <div className="summary-pro">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="avatar" src={professional.profilePhotoUrl} alt="" />
            <div>
              <strong>{professional.name}</strong>
              <span className="mono dim">
                {typeLabel(professional.type)} · {professional.city}
              </span>
            </div>
          </div>
          <div className="summary-lines mono">
            <div>
              <span className="dim">evento</span>
              <span>{conversation.eventType}</span>
            </div>
            <div>
              <span className="dim">data</span>
              <span>
                {conversation.eventDate}
                {conversation.eventTime ? ` às ${conversation.eventTime}` : ""}
              </span>
            </div>
            <div>
              <span className="dim">local</span>
              <span>{conversation.eventLocation}</span>
            </div>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <strong>{brl(price)}</strong>
          </div>
          {error && <div className="form-error">{error}</div>}
          {pixCharge && !expired ? (
            <p className="pix-waiting mono" style={{ textAlign: "center" }}>
              ⏳ Aguardando pagamento…{remaining !== null ? ` (${mmss(remaining)})` : ""}
            </p>
          ) : pixCharge && expired ? (
            <button
              type="button"
              className="btn btn-coral checkout-pay"
              disabled={paying}
              onClick={regeneratePix}
            >
              {paying ? "Gerando…" : "Gerar novo PIX"}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-coral checkout-pay"
              disabled={paying || (!pixEnabled && !manualPixKey)}
              onClick={pay}
            >
              {paying
                ? pixEnabled
                  ? "Gerando PIX…"
                  : "Enviando…"
                : pixEnabled
                  ? `Gerar PIX de ${brl(price)}`
                  : "Já fiz o PIX"}
            </button>
          )}
          <p className="checkout-fineprint mono">
            {pixEnabled
              ? "Ao pagar você concorda que o valor fica retido pela Clique até a confirmação do serviço."
              : "A Clique confere o recebimento antes de liberar o contato — o valor fica em custódia até a confirmação do serviço."}
          </p>
        </aside>
      </div>
    </div>
  );
}
