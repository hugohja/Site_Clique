/**
 * Regras de força de senha, compartilhadas entre cliente (medidor ao vivo) e
 * servidor (validação no cadastro).
 *
 * Uma senha é aceita (forte) quando tem no mínimo 8 caracteres e contém pelo
 * menos uma letra, um número e um caractere especial.
 */
export interface PasswordCheck {
  longEnough: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  /** 0–4: quantos critérios cumpridos. */
  score: number;
  label: "fraca" | "média" | "forte";
  /** true = cumpre todos os critérios e pode ser aceita. */
  strong: boolean;
}

export function checkPassword(pw: string): PasswordCheck {
  const longEnough = pw.length >= 8;
  const hasLetter = /[A-Za-z]/.test(pw);
  const hasNumber = /\d/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  const score = [longEnough, hasLetter, hasNumber, hasSpecial].filter(Boolean).length;
  const strong = longEnough && hasLetter && hasNumber && hasSpecial;
  const label = strong ? "forte" : score >= 3 ? "média" : "fraca";
  return { longEnough, hasLetter, hasNumber, hasSpecial, score, label, strong };
}

export function isStrongPassword(pw: string): boolean {
  return checkPassword(pw).strong;
}
