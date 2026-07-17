/**
 * Filtro anti-desintermediação do chat.
 *
 * Censura padrões óbvios de troca de contato direto (telefone, WhatsApp,
 * @usuário, e-mail, links). Não pretende ser perfeito — o objetivo é fechar o
 * caminho fácil e sinalizar pro usuário que a plataforma monitora isso.
 * Roda SEMPRE no servidor, antes de persistir a mensagem.
 */

const CENSOR = "***";

const CONTACT_PATTERNS: RegExp[] = [
  // Sequências com cara de telefone: 9+ dígitos com separadores comuns
  // (evita censurar datas tipo 17/07/2026, que têm 8 dígitos).
  /(?:\+?\d[\s\-.()]*){9,}\d/g,
  // E-mail (antes do @usuário, que capturaria só metade).
  /[\w.+-]+@[\w-]+\.[\w.-]+/g,
  // Menções a apps de mensagem/rede social.
  /\b(?:whats\s?app|whats|wpp|zap+|zapzap|telegram|t\.me|signal|insta(?:gram)?|face(?:book)?|tik\s?tok|direct|dm)\b/gi,
  // @usuário.
  /@[a-zA-Z0-9_.]{2,}/g,
  // Links e domínios.
  /(?:https?:\/\/|www\.)\S+/gi,
  /\b[\w-]+\.(?:com|com\.br|net|org|br|io|me|link|app)(?:\/\S*)?\b/gi,
  // Pedidos explícitos de contato por fora.
  /\b(?:me\s+liga|te\s+ligo|liga\s+pra\s+mim|meu\s+n[úu]mero|passa\s+(?:seu|teu|o)\s+n[úu]mero|fora\s+da\s+plataforma|por\s+fora)\b/gi,
];

export interface ModerationResult {
  text: string;
  /** true se algum trecho foi censurado. */
  filtered: boolean;
}

export function censorContactAttempts(raw: string): ModerationResult {
  let text = raw;
  let filtered = false;
  for (const pattern of CONTACT_PATTERNS) {
    if (pattern.test(text)) {
      filtered = true;
      pattern.lastIndex = 0;
      text = text.replace(pattern, CENSOR);
    }
    pattern.lastIndex = 0;
  }
  return { text, filtered };
}
