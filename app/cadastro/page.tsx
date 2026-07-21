import CadastroForm from "@/components/CadastroForm";

export const metadata = {
  title: "Cadastro de profissional — Clique",
};

export default function CadastroPage() {
  return (
    <div className="container form-page">
      <h1>Apareça pra quem está procurando</h1>
      <p>
        Preencha o básico e seu perfil já entra na busca. Sem mensalidade nesta fase — os pedidos
        chegam pelo chat do Clique, e seu WhatsApp só é revelado ao cliente depois do pagamento
        confirmado.
      </p>
      <CadastroForm />
    </div>
  );
}
