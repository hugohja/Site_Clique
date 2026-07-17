"use client";

export interface PortfolioDraft {
  file: File;
  url: string; // preview (object URL)
  aspect: "wide" | "tall" | "square";
  cover: boolean;
}

const SHAPES: { value: PortfolioDraft["aspect"]; label: string }[] = [
  { value: "square", label: "Quadrada" },
  { value: "wide", label: "Larga" },
  { value: "tall", label: "Alta" },
];

const MIN = 3;

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
      aspect: "square",
      cover: false,
    }));
    const next = [...items, ...added];
    if (!next.some((i) => i.cover) && next.length > 0) next[0].cover = true;
    onChange(next);
  }

  function update(idx: number, patch: Partial<PortfolioDraft>) {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
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
        Adicione uma a uma ou várias de vez. Em cada foto você escolhe o <b>formato</b>, a{" "}
        <b>ordem</b> (◀ ▶) e a <b>capa</b> (★).
      </p>
      <div className="pf-list">
        {items.map((it, i) => (
          <div key={it.url} className={`pf-item${it.cover ? " is-cover" : ""}`}>
            <div className="pf-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element -- object URL local */}
              <img src={it.url} alt="" />
              {it.cover && <span className="pf-cover-tag">capa</span>}
            </div>
            <div className="pf-controls">
              <select
                className="pf-shape"
                value={it.aspect}
                onChange={(e) => update(i, { aspect: e.target.value as PortfolioDraft["aspect"] })}
              >
                {SHAPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
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
        ))}
      </div>
    </div>
  );
}
