import CadastroForm from "@/components/CadastroForm";

export const metadata = {
  title: "Cadastro de profissional — Clica",
};

export default function CadastroPage() {
  return (
    <div className="container form-page">
      <h1>Apareça pra quem está procurando</h1>
      <p>
        Preencha o básico e seu perfil já entra na busca. Sem mensalidade nesta fase — o contato do
        cliente chega direto no seu WhatsApp.
      </p>
      <CadastroForm />
    </div>
  );
}
