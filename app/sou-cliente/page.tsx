import { Suspense } from "react";
import ClientForm from "@/components/ClientForm";

export const metadata = {
  title: "Criar conta de cliente — Clique",
};

export default function SouClientePage() {
  return (
    <div className="container form-page">
      <h1>Sua conta de cliente</h1>
      <p>
        Pra segurança dos dois lados, quem contrata também passa por um cadastro com verificação de
        identidade — igual aos profissionais. É rápido e você só faz uma vez; depois é só conversar
        e fechar.
      </p>
      <Suspense fallback={null}>
        <ClientForm />
      </Suspense>
    </div>
  );
}
