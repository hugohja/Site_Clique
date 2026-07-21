import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";

export const metadata = { title: "Entrar — Clique" };

export default function EntrarPage() {
  return (
    <div className="container form-page">
      <h1>Entrar</h1>
      <p>Acesse sua conta de profissional ou de cliente.</p>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
