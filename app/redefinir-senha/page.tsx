import { Suspense } from "react";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export const metadata = { title: "Redefinir senha — Clique" };

export default function RedefinirSenhaPage() {
  return (
    <div className="container form-page">
      <h1>Redefinir senha</h1>
      <p>Escolha uma nova senha para a sua conta.</p>
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
