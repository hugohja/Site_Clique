"use client";

/** Campos de acesso à conta (login + senha), compartilhados pelos dois cadastros. */
export default function CredentialFields() {
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
            minLength={6}
            placeholder="mínimo 6 caracteres"
          />
        </div>
        <div className="field">
          <label htmlFor="password2">Confirmar senha</label>
          <input id="password2" name="password2" type="password" required minLength={6} placeholder="repita a senha" />
        </div>
      </div>
    </>
  );
}
