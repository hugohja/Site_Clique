import ForgotPasswordForm from "@/components/ForgotPasswordForm";

export const metadata = { title: "Esqueci minha senha — Clique" };

export default function EsqueciSenhaPage() {
  return (
    <div className="container form-page">
      <h1>Esqueci minha senha</h1>
      <p>Informe o e-mail da sua conta e enviamos um link para você criar uma nova senha.</p>
      <ForgotPasswordForm />
    </div>
  );
}
