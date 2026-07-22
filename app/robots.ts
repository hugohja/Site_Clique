import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Áreas privadas/transacionais não devem ser indexadas.
      disallow: ["/admin", "/conversas", "/conversa/", "/carteira", "/configuracoes", "/api/"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
