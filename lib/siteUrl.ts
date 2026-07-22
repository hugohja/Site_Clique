/**
 * URL canônica do site, usada em metadados (OG, sitemap, canonical).
 * Ordem: NEXT_PUBLIC_SITE_URL (defina no Vercel com seu domínio) → VERCEL_URL
 * (deploy atual) → localhost (dev).
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
