"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Item {
  id: string;
  status: string;
  eventType: string;
  eventDate: string;
  professionalId: string;
  agreedPrice: number | null;
  otherName: string;
  lastMessage: string;
  unread: boolean;
  createdAt: string;
}

const LABEL: Record<string, string> = {
  conversando: "conversando",
  proposta_enviada: "proposta enviada",
  proposta_aceita: "aguardando pagamento",
  pagamento_confirmado: "pago",
  contato_liberado: "pago · em andamento",
  concluido: "concluído ✓",
  em_disputa: "em disputa",
  reembolsado: "reembolsado",
};

export default function ConversasPage() {
  const router = useRouter();
  const [data, setData] = useState<{ role: string; conversations: Item[] } | null>(null);

  useEffect(() => {
    fetch("/api/conversas")
      .then(async (r) => {
        if (r.status === 401) {
          router.push("/entrar?next=/conversas");
          return;
        }
        setData(await r.json());
      })
      .catch(() => setData({ role: "", conversations: [] }));
  }, [router]);

  return (
    <section className="results">
      <div className="container">
        <h1 style={{ marginBottom: "1.2rem" }}>Minhas conversas</h1>
        {!data ? (
          <p className="mono" style={{ color: "var(--text-dim)" }}>
            carregando…
          </p>
        ) : data.conversations.length === 0 ? (
          <div className="empty-state">
            <span className="mono">SEM_CONVERSAS</span>
            Você ainda não tem conversas.{" "}
            <Link href="/" style={{ textDecoration: "underline" }}>
              buscar profissionais
            </Link>
            .
          </div>
        ) : (
          <div className="inbox">
            {data.conversations.map((c) => (
              <Link
                key={c.id}
                href={`/conversa/${c.id}`}
                className={`inbox-item${c.unread ? " unread" : ""}`}
              >
                <div className="inbox-top">
                  <strong>
                    {c.unread && <span className="unread-dot" aria-hidden />}
                    {c.otherName}
                  </strong>
                  <span className={`status-badge mono status-${c.status}`}>
                    {LABEL[c.status] ?? c.status}
                  </span>
                </div>
                <span className="inbox-meta mono">
                  {c.eventType} · {c.eventDate}
                  {c.agreedPrice ? ` · R$ ${c.agreedPrice.toLocaleString("pt-BR")}` : ""}
                </span>
                {c.lastMessage && (
                  <span className="inbox-last">
                    {c.unread && <strong className="unread-tag">nova · </strong>}
                    {c.lastMessage}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
