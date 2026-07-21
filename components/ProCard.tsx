import Link from "next/link";
import type { Professional } from "@/lib/types";
import { formatExif, typeLabel } from "@/lib/format";

export default function ProCard({ pro }: { pro: Professional }) {
  return (
    <Link href={`/profissional/${pro.id}`} className="pro-card">
      <span className="film-strip" aria-hidden />
      <span className="pro-card-body">
        <span className="pro-card-top">
          <h3>{pro.name}</h3>
          <span className="pro-type mono">{typeLabel(pro.type)}</span>
        </span>
        <span className="pro-city">{pro.city}</span>
        <span className="tag-row">
          {pro.specialties.map((s) => (
            <span key={s} className="tag">
              {s}
            </span>
          ))}
        </span>
        <span className="exif mono">
          {formatExif(pro)}
          {pro.noShowCount > 0 && (
            <span className="noshow-flag"> · ⚠ {pro.noShowCount} não compareceu</span>
          )}
        </span>
      </span>
    </Link>
  );
}
