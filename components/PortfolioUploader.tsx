"use client";

export interface PortfolioDraft {
  file: File;
  url: string; // preview (object URL)
  /** Enquadramento (object-position "x% y%") escolhido clicando na foto. */
  focus: string;
  cover: boolean;
}

const MIN = 3;

function focusXY(focus: string): { left: string; top: string } {
  const [x = "50%", y = "50%"] = focus.split(" ");
  return { left: x, top: y };
}

export default function PortfolioUploader({
  items,
  onChange,
}: {
  items: PortfolioDraft[];
  onChange: (items: PortfolioDraft[]) => void;
}) {
  function addFiles(files: FileList | null) {
    if (!files) return;
    const added: PortfolioDraft[] = Array.from(files).map((file) => ({
      file,
      url: URL.createObjectURL(file),
      focus: "50% 50%",
      cover: false,
    }));
    const next = [...items, ...added];
    if (!next.some((i) => i.cover) && next.length > 0) next[0].cover = true;
    onChange(next);
  }

  function update(idx: number, patch: Partial<PortfolioDraft>) {
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
    URL.revokeObjectURL(items[idx].url);
    const next = items.filter((_, i) => i !== idx);
    if (next.length > 0 && !next.some((i) => i.cover)) next[0].cover = true;
    onChange(next);
  }

  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[idx], next[j]] = [next[j], next[idx]];
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
        Todas as fotos aparecem no mesmo tamanho. <b>Clique na foto</b> para escolher o enquadramento
        (o ponto que fica centralizado), use ◀ ▶ para a <b>ordem</b> e ★ para a <b>capa</b>.
      </p>
      <div className="pf-list">
        {items.map((it, i) => {
          const dot = focusXY(it.focus);
          return (
            <div key={it.url} className={`pf-item${it.cover ? " is-cover" : ""}`}>
              <button
                type="button"
                className="pf-thumb"
                onClick={(e) => setFocusFromClick(i, e)}
                title="Clique para escolher o enquadramento"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- object URL local */}
                <img src={it.url} alt="" style={{ objectPosition: it.focus }} />
                {it.cover && <span className="pf-cover-tag">capa</span>}
                <span className="pf-focus-dot" style={{ left: dot.left, top: dot.top }} aria-hidden />
              </button>
              <div className="pf-controls">
                <div className="pf-btns">
                  <button type="button" title="mover pra esquerda" onClick={() => move(i, -1)}>
                    ◀
                  </button>
                  <button
                    type="button"
                    title="definir como capa"
                    className={it.cover ? "on" : ""}
                    onClick={() => setCover(i)}
                  >
                    ★
                  </button>
                  <button type="button" title="mover pra direita" onClick={() => move(i, 1)}>
                    ▶
                  </button>
                  <button type="button" title="remover" onClick={() => remove(i)}>
                    ✕
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
