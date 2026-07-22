import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import HeaderNav from "@/components/HeaderNav";
import PwaRegister from "@/components/PwaRegister";
import { siteUrl } from "@/lib/siteUrl";
import "./globals.css";

const DESCRIPTION =
  "Encontre fotógrafos, filmmakers e editores freelancers em todo o Brasil. Veja o portfólio, converse pelo chat do Clique e feche com segurança.";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Clique — fotógrafos, filmmakers e editores para o seu evento",
    template: "%s · Clique",
  },
  description: DESCRIPTION,
  applicationName: "Clique",
  keywords: [
    "fotógrafo",
    "filmmaker",
    "editor de vídeo",
    "fotografia de evento",
    "casamento",
    "freelancer",
    "contratar fotógrafo",
    "Brasil",
  ],
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
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Clique",
    title: "Clique — fotógrafos, filmmakers e editores para o seu evento",
    description: DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Clique — fotógrafos, filmmakers e editores para o seu evento",
    description: DESCRIPTION,
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
            <span className="mono footer-meta">© {new Date().getFullYear()} Clique · Brasil</span>
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
