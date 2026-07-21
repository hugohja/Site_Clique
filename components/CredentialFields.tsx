"use client";

import { useState } from "react";
import { checkPassword } from "@/lib/password";

/** Campos de acesso à conta (login + senha), compartilhados pelos dois cadastros. */
export default function CredentialFields() {
  const [password, setPassword] = useState("");
  const c = checkPassword(password);
  const show = password.length > 0;
  const level = c.strong ? "forte" : c.score >= 3 ? "media" : "fraca";

  return (
    <>
      <hr className="form-sep" />
      <p className="form-sec-title">Acesso à conta</p>
      <div className="field">
        <label htmlFor="loginEmail">E-mail (seu login)</label>
        <input id="loginEmail" name="loginEmail" type="email" required placeholder="voce@email.com" />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="letra + número + caractere especial"
          />
          {show && (
            <div className={`pw-strength pw-${level}`}>
              <div className="pw-bar" aria-hidden>
                <span style={{ width: `${(c.score / 4) * 100}%` }} />
              </div>
              <span className="pw-label mono">
                senha {c.label}
                {!c.strong ? " — precisa de mais" : " ✓"}
              </span>
              {!c.strong && (
                <ul className="pw-reqs mono">
                  <li className={c.longEnough ? "ok" : ""}>8+ caracteres</li>
                  <li className={c.hasLetter ? "ok" : ""}>1 letra</li>
                  <li className={c.hasNumber ? "ok" : ""}>1 número</li>
                  <li className={c.hasSpecial ? "ok" : ""}>1 especial (!@#…)</li>
                </ul>
              )}
            </div>
          )}
        </div>
        <div className="field">
          <label htmlFor="password2">Confirmar senha</label>
          <input id="password2" name="password2" type="password" required placeholder="repita a senha" />
        </div>
      </div>
    </>
  );
}
