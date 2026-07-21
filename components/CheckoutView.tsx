"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Conversation, PublicProfessional } from "@/lib/types";
import { typeLabel } from "@/lib/format";

interface Payload {
  viewerRole: "cliente" | "profissional" | "admin";
  conversation: Omit<Conversation, "clientWhatsapp">;
  professional: PublicProfessional;
}

type Method = "pix" | "cartao";

function brl(value: number) {
  return `R$ ${value.toLocaleString("pt-BR")}`;
}

/**
 * Checkout da custódia (fase de teste: pagamento SIMULADO). Só o cliente da
 * conversa, com a proposta aceita, pode pagar. Ao confirmar, chama a rota de
 * pagamento (que segura o valor e libera o contato) e volta pra conversa.
 */
export default function CheckoutView({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound" | "denied">("loading");
  const [method, setMethod] = useState<Method>("pix");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, [load]);

  async function pay() {
    setError(null);
    setPaying(true);
    try {
      const res = await fetch(`/api/conversas/${conversationId}/pagamento`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Não foi possível concluir o pagamento.");
        return;
      }
      // Volta pra conversa, onde o código de custódia aparece.
      router.push(`/conversa/${conversationId}`);
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setPaying(false);
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
    const alreadyPaid = ["contato_liberado", "concluido", "em_disputa", "reembolsado"].includes(
      conversation.status
    );
    return (
      <div className="container" style={{ paddingBlock: "4rem" }}>
        <div className="empty-state">
          <span className="mono">CHECKOUT_INDISPONIVEL</span>
          {alreadyPaid
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
            <div className="method-options">
              <button
                type="button"
                className={`method-chip ${method === "pix" ? "on" : ""}`}
                onClick={() => setMethod("pix")}
              >
                <b>PIX</b>
                <span className="mono">aprovação na hora</span>
              </button>
              <button
                type="button"
                className={`method-chip ${method === "cartao" ? "on" : ""}`}
                onClick={() => setMethod("cartao")}
              >
                <b>Cartão de crédito</b>
                <span className="mono">até 12x</span>
              </button>
            </div>

            {method === "pix" ? (
              <div className="method-body">
                <div className="pix-fake" aria-hidden>
                  <div className="pix-qr" />
                  <div>
                    <p className="mono">PIX copia e cola</p>
                    <code className="pix-code mono">clique-custodia-{conversationId.slice(0, 8)}</code>
                  </div>
                </div>
                <p className="form-hint">Simulação desta fase — nenhum valor real é cobrado.</p>
              </div>
            ) : (
              <div className="method-body">
                <div className="card-fake">
                  <div className="field">
                    <label htmlFor="cc-num">Número do cartão</label>
                    <input id="cc-num" inputMode="numeric" placeholder="0000 0000 0000 0000" disabled />
                  </div>
                  <div className="card-row">
                    <div className="field">
                      <label htmlFor="cc-exp">Validade</label>
                      <input id="cc-exp" placeholder="MM/AA" disabled />
                    </div>
                    <div className="field">
                      <label htmlFor="cc-cvv">CVV</label>
                      <input id="cc-cvv" placeholder="000" disabled />
                    </div>
                  </div>
                </div>
                <p className="form-hint">Simulação desta fase — nenhum valor real é cobrado.</p>
              </div>
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
              <span>{conversation.eventDate}</span>
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
          <button type="button" className="btn btn-coral checkout-pay" disabled={paying} onClick={pay}>
            {paying ? "Processando…" : `Pagar ${brl(price)} em custódia`}
          </button>
          <p className="checkout-fineprint mono">
            Ao pagar você concorda que o valor fica retido pela Clique até a confirmação do serviço.
          </p>
        </aside>
      </div>
    </div>
  );
}
