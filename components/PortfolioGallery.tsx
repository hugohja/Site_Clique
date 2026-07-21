"use client";

import { useEffect, useState } from "react";

interface Shot {
  id: string;
  url: string;
  label: string;
  cover: boolean;
}

/** Visualizador em tela cheia (lightbox) com navegação por teclado e setas. */
function Lightbox({
  items,
  index,
  setIndex,
  onClose,
}: {
  items: Shot[];
  index: number;
  setIndex: (i: number) => void;
  onClose: () => void;
}) {
  const len = items.length;
  const prev = () => setIndex((index - 1 + len) % len);
  const next = () => setIndex((index + 1) % len);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") setIndex((index + 1) % len);
      else if (e.key === "ArrowLeft") setIndex((index - 1 + len) % len);
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, len]);

  return (
    <div className="pf-lightbox" role="dialog" aria-modal="true" onClick={onClose}>
      <button type="button" className="pf-lb-close" onClick={onClose} aria-label="Fechar">
        ×
      </button>
      {len > 1 && (
        <button
          type="button"
          className="pf-lb-nav pf-lb-prev"
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          aria-label="Foto anterior"
        >
          ‹
        </button>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="pf-lb-img"
        src={items[index].url}
        alt=""
        onClick={(e) => e.stopPropagation()}
      />
      {len > 1 && (
        <button
          type="button"
          className="pf-lb-nav pf-lb-next"
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          aria-label="Próxima foto"
        >
          ›
        </button>
      )}
      <span className="pf-lb-count mono">
        {index + 1} / {len}
      </span>
    </div>
  );
}

/** Portfólio: fotos inteiras (sem corte) em mosaico; clique abre em tela cheia. */
export default function PortfolioGallery({ items }: { items: Shot[] }) {
  const [index, setIndex] = useState<number | null>(null);

  return (
    <>
      <div className="pf-masonry">
        {items.map((it, i) => (
          <button
            key={it.id}
            type="button"
            className="pf-shot"
            onClick={() => setIndex(i)}
            aria-label={`Ampliar foto ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.url} alt="" loading="lazy" />
            {it.cover && <span className="pf-cover-badge">capa</span>}
          </button>
        ))}
      </div>

      {index !== null && (
        <Lightbox items={items} index={index} setIndex={setIndex} onClose={() => setIndex(null)} />
      )}
    </>
  );
}
