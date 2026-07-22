import { ImageResponse } from "next/og";

// Cartão de compartilhamento padrão do site (link no WhatsApp, redes, etc.).
export const alt = "Clique — fotógrafos, filmmakers e editores para o seu evento";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #2b4bf2 0%, #1a2fb0 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 800, marginBottom: 8 }}>Clique ●</div>
        <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.15, maxWidth: 900 }}>
          Quem vai fotografar o seu próximo evento?
        </div>
        <div style={{ fontSize: 30, marginTop: 28, opacity: 0.9, maxWidth: 950 }}>
          Fotógrafos, filmmakers e editores freelancers em todo o Brasil. Portfólio, chat e
          pagamento com segurança.
        </div>
      </div>
    ),
    { ...size }
  );
}
