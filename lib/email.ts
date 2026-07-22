/**
 * Envio de e-mail transacional (sem dependência externa) via API REST do Resend.
 *
 * Gate por variáveis de ambiente:
 *   RESEND_API_KEY  chave da conta Resend (sem ela, nada é enviado — no-op)
 *   EMAIL_FROM      remetente, ex: "Clique <no-reply@seudominio.com>"
 *                   (sem domínio verificado, o Resend só entrega pro dono da conta)
 *
 * Sem RESEND_API_KEY, isEmailConfigured() = false e o app segue funcionando
 * normalmente — as notificações viram no-op, sem quebrar nenhuma ação.
 */

const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || "Clique <onboarding@resend.dev>";

export function isEmailConfigured(): boolean {
  return Boolean(API_KEY);
}

function isValidEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  if (!API_KEY) return; // não configurado → no-op silencioso
  if (!input.to || !isValidEmail(input.to)) return;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${body.slice(0, 200)}`);
  }
}

/**
 * Molde HTML simples e sóbrio, no tom do Clique. `cta` (opcional) vira um botão
 * apontando pra `ctaUrl`. Retorna { html, text } prontos pro sendEmail.
 */
export function renderEmail(input: {
  heading: string;
  lines: string[];
  cta?: string;
  ctaUrl?: string;
}): { html: string; text: string } {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paragraphs = input.lines
    .map((l) => `<p style="margin:0 0 12px;line-height:1.5;color:#333">${esc(l)}</p>`)
    .join("");
  const button =
    input.cta && input.ctaUrl
      ? `<a href="${input.ctaUrl}" style="display:inline-block;margin-top:8px;background:#2b4bf2;color:#fff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:600">${esc(
          input.cta
        )}</a>`
      : "";
  const html = `<!doctype html><html><body style="margin:0;background:#f4f5f7;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:28px 26px;border:1px solid #e6e8eb">
      <div style="font-weight:800;font-size:20px;color:#2b4bf2;margin-bottom:16px">Clique</div>
      <h1 style="font-size:18px;margin:0 0 14px;color:#111">${esc(input.heading)}</h1>
      ${paragraphs}
      ${button}
      <p style="margin:22px 0 0;font-size:12px;color:#9aa0a6">Você recebe este aviso porque tem uma conta no Clique. O contato entre as partes é sempre pelo chat da plataforma.</p>
    </div>
  </body></html>`;
  const text = [input.heading, "", ...input.lines, input.ctaUrl ? `\n${input.cta}: ${input.ctaUrl}` : ""]
    .join("\n")
    .trim();
  return { html, text };
}
