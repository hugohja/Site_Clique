import type { MetadataRoute } from "next";
import { repository } from "@/lib/data";
import { isAdminEmail } from "@/lib/admin";
import { siteUrl } from "@/lib/siteUrl";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const staticRoutes = ["", "/cadastro", "/sou-cliente", "/entrar", "/termos", "/privacidade"].map(
    (path) => ({ url: `${base}${path}`, changeFrequency: "weekly" as const, priority: path === "" ? 1 : 0.5 })
  );

  let pros: MetadataRoute.Sitemap = [];
  try {
    const all = await repository.list({});
    pros = all
      .filter((p) => !isAdminEmail(p.email))
      .map((p) => ({
        url: `${base}/profissional/${p.id}`,
        lastModified: p.createdAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
  } catch {
    /* sem banco disponível — só as rotas estáticas */
  }

  return [...staticRoutes, ...pros];
}
