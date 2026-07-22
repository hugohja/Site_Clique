/**
 * Filtro anti-desintermediação do chat.
 *
 * Censura padrões óbvios de troca de contato direto (telefone, WhatsApp,
 * @usuário, e-mail, links). Não pretende ser perfeito — o objetivo é fechar o
 * caminho fácil e sinalizar pro usuário que a plataforma monitora isso.
 * Roda SEMPRE no servidor, antes de persistir a mensagem.
 */

const CENSOR = "***";

// Nome dos apps/redes sociais (inclui "arroba", usado pra driblar o @).
const SOCIAL =
  "(?:whats\\s?app|whats|wpp|zap+|zapzap|telegram|t\\.me|signal|insta(?:gram)?|face(?:book)?|tik\\s?tok|arroba|snap(?:chat)?|kwai|direct|dm)";

// Palavrinhas de ligação que costumam separar a rede social do usuário
// ("insta É hugohja", "meu insta hugohja", "insta aí fulano"...).
const FILLER = "(?:e|eh|é|o|a|no|na|meu|minha|ai|aí|la|lá|arroba)";

const CONTACT_PATTERNS: RegExp[] = [
  // Sequências com cara de telefone: 9+ dígitos com separadores comuns
  // (evita censurar datas tipo 17/07/2026, que têm 8 dígitos).
  /(?:\+?\d[\s\-.()]*){9,}\d/g,
  // E-mail (antes do @usuário, que capturaria só metade).
  /[\w.+-]+@[\w-]+\.[\w.-]+/g,
  // Rede social + o @usuário logo em seguida (mesmo com "é/no/meu/aí" no meio):
  // censura a rede social E o nome de usuário juntos. Fecha o "me chama no insta fulano".
  new RegExp(`\\b${SOCIAL}\\b(?:\\s+${FILLER}(?=\\s)){0,2}\\s*[:@=./\\-]?\\s*[a-zA-Z0-9_][a-zA-Z0-9_.]+`, "gi"),
  // Rede social sozinha (sem usuário ao lado).
  new RegExp(`\\b${SOCIAL}\\b`, "gi"),
  // @usuário (aceita espaço depois do @: "@ fulano").
  /@\s*[a-zA-Z0-9_.]{2,}/g,
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

/**
 * Detecta (sem censurar) tentativa de expor contato/rede social. Usado em
 * campos de PERFIL (bio), onde a regra é BLOQUEAR o salvamento — diferente do
 * chat, que apenas censura. Assim o profissional não consegue publicar
 * telefone, e-mail, @, link ou nome de rede social no perfil público, fechando
 * o caminho pra combinar por fora.
 */
export function hasContactInfo(raw: string): boolean {
  const found = CONTACT_PATTERNS.some((pattern) => {
    const hit = pattern.test(raw);
    pattern.lastIndex = 0;
    return hit;
  });
  return found;
}
