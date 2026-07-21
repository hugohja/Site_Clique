"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { typeLabel } from "@/lib/format";
import type { ProfessionalType } from "@/lib/types";

export interface AdminProRow {
  id: string;
  name: string;
  type: ProfessionalType;
  city: string;
  status: string;
  photo: string;
}
export interface AdminClientRow {
  id: string;
  name: string;
  city: string;
  status: string;
  photo: string;
}

/** minúsculas + sem acento, pra busca tolerante. */
function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Busca dos cadastros no painel admin. Filtra profissionais e clientes por
 * nome ou cidade em tempo real — para achar rápido quem precisa de ajuste
 * mesmo com a base cheia.
 */
export default function AdminBrowse({
  pros,
  clients,
}: {
  pros: AdminProRow[];
  clients: AdminClientRow[];
}) {
  const [query, setQuery] = useState("");
  const q = norm(query.trim());

  const proHits = useMemo(
    () => (q ? pros.filter((p) => norm(`${p.name} ${p.city}`).includes(q)) : pros),
    [pros, q]
  );
  const cliHits = useMemo(
    () => (q ? clients.filter((c) => norm(`${c.name} ${c.city}`).includes(q)) : clients),
    [clients, q]
  );

  return (
    <section className="admin-section">
      <div className="admin-browse-head">
        <h2 className="section-title">Todos os cadastros</h2>
        <input
          className="admin-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou cidade…"
          aria-label="Buscar cadastros"
        />
      </div>

      <h3 className="admin-subhead">Profissionais ({proHits.length})</h3>
      {proHits.length === 0 ? (
        <p className="admin-meta mono">Nenhum profissional encontrado.</p>
      ) : (
        <div className="admin-manage">
          {proHits.map((p) => (
            <div key={p.id} className="admin-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="admin-avatar admin-avatar-sm" src={p.photo} alt="" />
              <div className="admin-row-info">
                <strong>{p.name}</strong>
                <span className="admin-meta mono">
                  {typeLabel(p.type)} · {p.city} · {p.status}
                </span>
              </div>
              <Link href={`/admin/profissional/${p.id}`} className="btn btn-sm btn-ghost">
                Editar
              </Link>
            </div>
          ))}
        </div>
      )}

      <h3 className="admin-subhead">Clientes ({cliHits.length})</h3>
      {cliHits.length === 0 ? (
        <p className="admin-meta mono">Nenhum cliente encontrado.</p>
      ) : (
        <div className="admin-manage">
          {cliHits.map((c) => (
            <div key={c.id} className="admin-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="admin-avatar admin-avatar-sm" src={c.photo} alt="" />
              <div className="admin-row-info">
                <strong>{c.name}</strong>
                <span className="admin-meta mono">
                  {c.city || "—"} · {c.status}
                </span>
              </div>
              <Link href={`/admin/cliente/${c.id}`} className="btn btn-sm btn-ghost">
                Editar
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
