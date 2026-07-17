import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers: async () => [
    {
      // O service worker precisa poder atualizar sem ficar preso em cache.
      source: "/sw.js",
      headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
    },
  ],
};

export default nextConfig;
