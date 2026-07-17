import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import PwaRegister from "@/components/PwaRegister";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "600", "700"],
});
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Clica — fotógrafos e filmmakers para o seu evento",
  description:
    "Encontre fotógrafos e filmmakers freelancers no Rio de Janeiro, Niterói, Goiânia e Anápolis. Veja o portfólio, converse pelo chat do Clica e feche com segurança.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Clica",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png" }],
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#16130f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${inter.variable} ${plexMono.variable}`}>
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <Link href="/" className="logo">
              Clica<span className="logo-dot">●</span>
            </Link>
            <nav className="header-nav">
              <Link href="/" className="nav-link">
                Buscar
              </Link>
              <Link href="/cadastro" className="nav-link nav-link-cta">
                Sou profissional
              </Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="container footer-inner">
            <span className="mono footer-meta">CLICA · RJ — GO · protótipo v0.1</span>
            <span className="footer-note">
              Fotógrafos e filmmakers de evento. Converse e feche pelo Clica.
            </span>
          </div>
        </footer>
        <PwaRegister />
      </body>
    </html>
  );
}
