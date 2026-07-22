import Link from "next/link";
import type { Professional } from "@/lib/types";
import { formatExif, typeLabel } from "@/lib/format";
import { isReservedLabel } from "@/lib/types";
import { isTopRated } from "@/lib/ranking";

export default function ProCard({ pro }: { pro: Professional }) {
  const verified = pro.identity.status === "verificado";
  const topRated = isTopRated(pro);
  return (
    <Link href={`/profissional/${pro.id}`} className="pro-card">
      <span className="film-strip" aria-hidden />
      <span className="pro-card-body">
        <span className="pro-card-top">
          <h3>{pro.name}</h3>
          <span className="pro-type mono">{typeLabel(pro.type)}</span>
        </span>
        {(verified || topRated) && (
          <span className="pro-card-badges">
            {topRated && <span className="pro-badge top">★ bem avaliado</span>}
            {verified && <span className="pro-badge verified">✓ verificado</span>}
          </span>
        )}
        <span className="pro-city">{pro.city}</span>
        <span className="tag-row">
          {pro.specialties
            .filter((s) => !isReservedLabel(s))
            .map((s) => (
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
