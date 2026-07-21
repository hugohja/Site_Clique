"use client";

import { useState } from "react";

export interface PortfolioEntry {
  /** Chave estável para o React (id existente ou gerada para novas). */
  key: string;
  /** Preview (object URL de nova foto) ou URL já salva (foto existente). */
  url: string;
  /** Presente só nas fotos recém-adicionadas (as existentes já estão salvas). */
  file?: File;
  /** Enquadramento (object-position "x% y%"). */
  focus: string;
  cover: boolean;
}

const MIN = 3;
const MAX = 12;
let counter = 0;
export function newEntryKey(): string {
  counter += 1;
  return `pf-new-${counter}`;
}

function focusXY(focus: string): { left: string; top: string } {
  const [x = "50%", y = "50%"] = focus.split(" ");
  return { left: x, top: y };
}

/**
 * Editor de portfólio reutilizável (cadastro e edição de perfil).
 * - adicionar fotos (uma a uma ou várias)
 * - clicar na foto pra escolher o enquadramento (ponto focal)
 * - arrastar pra reordenar
 * - ★ define a capa, ✕ remove
 * Aceita fotos novas (com File) e existentes (só url).
 */
export default function PortfolioEditor({
  items,
  onChange,
}: {
  items: PortfolioEntry[];
  onChange: (items: PortfolioEntry[]) => void;
}) {
  const [dragI, setDragI] = useState<number | null>(null);
  const [overI, setOverI] = useState<number | null>(null);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const room = MAX - items.length;
    const added: PortfolioEntry[] = Array.from(files)
      .slice(0, Math.max(0, room))
      .map((file) => ({ key: newEntryKey(), url: URL.createObjectURL(file), file, focus: "50% 50%", cover: false }));
    const next = [...items, ...added];
    if (!next.some((i) => i.cover) && next.length > 0) next[0].cover = true;
    onChange(next);
  }

  function update(idx: number, patch: Partial<PortfolioEntry>) {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function setFocusFromClick(idx: number, e: React.MouseEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, Math.round(((e.clientX - r.left) / r.width) * 100)));
    const y = Math.min(100, Math.max(0, Math.round(((e.clientY - r.top) / r.height) * 100)));
    update(idx, { focus: `${x}% ${y}%` });
  }

  function setCover(idx: number) {
    const wasCover = items[idx].cover;
    onChange(items.map((it, i) => ({ ...it, cover: i === idx ? !wasCover : false })));
  }

  function remove(idx: number) {
    if (items[idx].file) URL.revokeObjectURL(items[idx].url);
    const next = items.filter((_, i) => i !== idx);
    if (next.length > 0 && !next.some((i) => i.cover)) next[0].cover = true;
    onChange(next);
  }

  function reorder(from: number, to: number) {
    if (from === to) return;
    const next = items.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  return (
    <div className="pf-uploader">
      <div className="pf-add">
        <label className="btn btn-sm" htmlFor="pfInput">
          + Adicionar fotos
        </label>
        <input
          id="pfInput"
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <span className="pf-count mono">
          {items.length} foto{items.length === 1 ? "" : "s"} (mín. {MIN})
        </span>
      </div>
      <p className="form-hint" style={{ marginTop: "0.5rem" }}>
        Todas aparecem no mesmo tamanho. <b>Clique na foto</b> pra escolher o enquadramento,{" "}
        <b>arraste</b> pra reordenar, ★ define a <b>capa</b> e ✕ remove.
      </p>
      <div className="pf-list">
        {items.map((it, i) => {
          const dot = focusXY(it.focus);
          return (
            <div
              key={it.key}
              className={`pf-item${it.cover ? " is-cover" : ""}${overI === i ? " pf-over" : ""}${
                dragI === i ? " pf-dragging" : ""
              }`}
              draggable
              onDragStart={() => setDragI(i)}
              onDragOver={(e) => {
                e.preventDefault();
                setOverI(i);
              }}
              onDragLeave={() => setOverI((o) => (o === i ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragI !== null) reorder(dragI, i);
                setDragI(null);
                setOverI(null);
              }}
              onDragEnd={() => {
                setDragI(null);
                setOverI(null);
              }}
            >
              <button
                type="button"
                className="pf-thumb"
                onClick={(e) => setFocusFromClick(i, e)}
                title="Clique para escolher o enquadramento"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- object URL / storage local */}
                <img src={it.url} alt="" draggable={false} style={{ objectPosition: it.focus }} />
                {it.cover && <span className="pf-cover-tag">capa</span>}
                <span className="pf-focus-dot" style={{ left: dot.left, top: dot.top }} aria-hidden />
              </button>
              <div className="pf-controls">
                <div className="pf-btns">
                  <button
                    type="button"
                    className={it.cover ? "on" : ""}
                    title="definir como capa"
                    onClick={() => setCover(i)}
                  >
                    ★
                  </button>
                  <button type="button" title="remover" onClick={() => remove(i)}>
                    ✕
                  </button>
                  <span className="pf-drag mono" title="arraste para reordenar" aria-hidden>
                    ⠿ arraste
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
