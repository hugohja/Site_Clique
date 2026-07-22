/**
 * Notificações por e-mail dos marcos da negociação. Tudo aqui é best-effort:
 * gated por isEmailConfigured() e embrulhado em try/catch, pra nunca derrubar a
 * ação do usuário. Chame via `after()` nas rotas, sem travar a resposta.
 *
 * Nunca vaza contato privado: os e-mails só citam nomes, evento e valor, e
 * mandam a pessoa abrir o chat na plataforma.
 */
import { repository, clientRepository } from "@/lib/data";
import { isEmailConfigured, renderEmail, sendEmail } from "@/lib/email";
import { formatBRL } from "@/lib/format";
import type { Conversation } from "@/lib/types";

function convUrl(baseUrl: string, id: string): string {
  return `${baseUrl.replace(/\/$/, "")}/conversa/${id}`;
}

async function parties(conv: Conversation) {
  const [pro, client] = await Promise.all([
    repository.getById(conv.professionalId),
    clientRepository.getById(conv.clientId),
  ]);
  return { pro, client };
}

/** Novo pedido chegou pro profissional (uma lead nova). */
export async function notifyNewConversation(conv: Conversation, baseUrl: string): Promise<void> {
  if (!isEmailConfigured()) return;
  try {
    const { pro } = await parties(conv);
    if (!pro?.email) return;
    const when = conv.eventTime ? `${conv.eventDate} às ${conv.eventTime}` : conv.eventDate;
    const { html, text } = renderEmail({
      heading: "Você recebeu um novo pedido no Clique",
      lines: [
        `${conv.clientName} quer falar sobre um serviço de ${conv.eventType}.`,
        `Data do evento: ${when} · Local: ${conv.eventLocation}.`,
        "Responda pelo chat e envie seu orçamento — o contato é liberado após o pagamento.",
      ],
      cta: "Abrir conversa",
      ctaUrl: convUrl(baseUrl, conv.id),
    });
    await sendEmail({ to: pro.email, subject: `Novo pedido de ${conv.clientName} — ${conv.eventType}`, html, text });
  } catch {
    /* e-mail é best-effort */
  }
}

/** Proposta ou contraproposta nova → avisa quem precisa responder. */
export async function notifyProposal(conv: Conversation, baseUrl: string): Promise<void> {
  if (!isEmailConfigured() || !conv.proposal) return;
  try {
    const { pro, client } = await parties(conv);
    const valor = formatBRL(conv.proposal.amount);
    if (conv.proposal.by === "profissional") {
      // Profissional propôs → avisa o cliente.
      if (!client?.email) return;
      const { html, text } = renderEmail({
        heading: "Você recebeu um orçamento",
        lines: [
          `${pro?.name ?? "O profissional"} enviou um orçamento de ${valor} para o seu ${conv.eventType}.`,
          "Você pode aceitar ou responder com uma contraproposta pelo chat.",
        ],
        cta: "Ver orçamento",
        ctaUrl: convUrl(baseUrl, conv.id),
      });
      await sendEmail({ to: client.email, subject: `Orçamento de ${valor} — ${conv.eventType}`, html, text });
    } else {
      // Cliente fez contraproposta → avisa o profissional.
      if (!pro?.email) return;
      const { html, text } = renderEmail({
        heading: "Você recebeu uma contraproposta",
        lines: [
          `${conv.clientName} respondeu com uma contraproposta de ${valor} para o ${conv.eventType}.`,
          "Você pode aceitar ou responder com outro valor pelo chat.",
        ],
        cta: "Ver contraproposta",
        ctaUrl: convUrl(baseUrl, conv.id),
      });
      await sendEmail({ to: pro.email, subject: `Contraproposta de ${valor} — ${conv.eventType}`, html, text });
    }
  } catch {
    /* best-effort */
  }
}

/** E-mail de boas-vindas/confirmação quando a conta é criada. */
export async function notifyWelcome(
  input: { to: string; name: string; role: "profissional" | "cliente" },
  baseUrl: string
): Promise<void> {
  if (!isEmailConfigured() || !input.to) return;
  try {
    const isPro = input.role === "profissional";
    const first = input.name.trim().split(/\s+/)[0] || input.name;
    const { html, text } = renderEmail({
      heading: `Bem-vindo(a) ao Clique, ${first}!`,
      lines: isPro
        ? [
            "Sua conta profissional foi criada e seu perfil já entra na busca.",
            "Sua identidade fica em análise — ao ser verificada, você ganha o selo ✓ e mais destaque na busca.",
            "Os pedidos chegam pelo chat; seu contato só é revelado ao cliente depois do pagamento.",
          ]
        : [
            "Sua conta foi criada. Agora é só achar um profissional e conversar pelo chat.",
            "O pagamento fica em custódia da Clique e só é liberado quando você confirmar, com o código, que o profissional compareceu.",
          ],
      cta: isPro ? "Abrir minhas configurações" : "Encontrar profissionais",
      ctaUrl: isPro ? `${baseUrl.replace(/\/$/, "")}/configuracoes` : baseUrl.replace(/\/$/, ""),
    });
    await sendEmail({ to: input.to, subject: "Bem-vindo(a) ao Clique", html, text });
  } catch {
    /* best-effort */
  }
}

/** Profissional recebeu uma nova avaliação. */
export async function notifyNewReview(
  input: { professionalId: string; rating: number; comment: string; clientName: string; eventType: string },
  baseUrl: string
): Promise<void> {
  if (!isEmailConfigured()) return;
  try {
    const pro = await repository.getById(input.professionalId);
    if (!pro?.email) return;
    const stars = "★".repeat(input.rating) + "☆".repeat(Math.max(0, 5 - input.rating));
    const lines = [
      `${input.clientName} avaliou o seu serviço de ${input.eventType}: ${stars} (${input.rating}/5).`,
    ];
    if (input.comment) lines.push(`"${input.comment}"`);
    lines.push("A avaliação já aparece no seu perfil e entra no cálculo da sua nota.");
    const { html, text } = renderEmail({
      heading: "Você recebeu uma nova avaliação",
      lines,
      cta: "Ver meu perfil",
      ctaUrl: `${baseUrl.replace(/\/$/, "")}/profissional/${pro.id}`,
    });
    await sendEmail({ to: pro.email, subject: `Nova avaliação: ${stars}`, html, text });
  } catch {
    /* best-effort */
  }
}

/** Proposta aceita → avisa quem tinha feito a proposta. */
export async function notifyProposalAccepted(conv: Conversation, baseUrl: string): Promise<void> {
  if (!isEmailConfigured() || !conv.proposal) return;
  try {
    const { pro, client } = await parties(conv);
    const valor = formatBRL(conv.proposal.amount);
    if (conv.proposal.by === "profissional") {
      // O cliente aceitou o orçamento do profissional → avisa o profissional.
      if (!pro?.email) return;
      const { html, text } = renderEmail({
        heading: "Sua proposta foi aceita 🎉",
        lines: [
          `${conv.clientName} aceitou seu orçamento de ${valor} para o ${conv.eventType}.`,
          "Agora é aguardar o pagamento em custódia — o contato é liberado assim que ele pagar.",
        ],
        cta: "Abrir conversa",
        ctaUrl: convUrl(baseUrl, conv.id),
      });
      await sendEmail({ to: pro.email, subject: `Proposta de ${valor} aceita — ${conv.eventType}`, html, text });
    } else {
      // O profissional aceitou a contraproposta do cliente → avisa o cliente.
      if (!client?.email) return;
      const { html, text } = renderEmail({
        heading: "Sua contraproposta foi aceita 🎉",
        lines: [
          `${pro?.name ?? "O profissional"} aceitou sua contraproposta de ${valor} para o ${conv.eventType}.`,
          "Faça o pagamento em custódia pra liberar o contato e combinar o evento.",
        ],
        cta: "Pagar em custódia",
        ctaUrl: convUrl(baseUrl, conv.id),
      });
      await sendEmail({ to: client.email, subject: `Contraproposta de ${valor} aceita — ${conv.eventType}`, html, text });
    }
  } catch {
    /* best-effort */
  }
}
