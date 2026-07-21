import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import HeaderNav from "@/components/HeaderNav";
import PwaRegister from "@/components/PwaRegister";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Clique — fotógrafos, filmmakers e editores para o seu evento",
  description:
    "Encontre fotógrafos, filmmakers e editores freelancers em todo o Brasil. Veja o portfólio, converse pelo chat do Clique e feche com segurança.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Clique",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png" }],
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2b4bf2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${plexMono.variable}`}>
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <Link href="/" className="logo">
              Clique<span className="logo-dot">●</span>
            </Link>
            <HeaderNav />
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="container footer-inner">
            <span className="mono footer-meta">CLIQUE · BRASIL · protótipo</span>
            <span className="footer-note">
              Fotógrafos, filmmakers e editores de foto e vídeo. Converse e feche pelo Clique.
            </span>
            <span className="footer-links">
              <Link href="/termos">Termos de Uso</Link>
              <Link href="/privacidade">Privacidade</Link>
            </span>
          </div>
        </footer>
        <PwaRegister />
      </body>
    </html>
  );
}
