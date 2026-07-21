import Link from "next/link";
import { TERMS_UPDATED, TERMS_VERSION } from "@/lib/legal";

export const metadata = { title: "Termos de Uso — Clique" };

export default function TermosPage() {
  return (
    <div className="container legal">
      <p className="legal-eyebrow mono">
        Termos de Uso · {TERMS_VERSION} · atualizado em {TERMS_UPDATED}
      </p>
      <h1>Termos de Uso</h1>
      <p className="legal-lead">
        Estes Termos regem o uso da plataforma Clique. Ao criar uma conta ou usar o serviço, você
        concorda com eles. Leia com atenção — especialmente as regras sobre fechar o negócio dentro
        da plataforma.
      </p>

      <h2>1. O que é a Clique</h2>
      <p>
        A Clique é um marketplace que conecta pessoas que querem contratar cobertura de eventos a
        fotógrafos, filmmakers e editores freelancers. A Clique é uma <strong>intermediadora</strong>:
        ela aproxima as partes, oferece o chat, a verificação de identidade e o fechamento do valor,
        mas <strong>não presta o serviço de fotografia/filmagem/edição</strong> nem é parte no
        contrato entre contratante e profissional.
      </p>

      <h2>2. Cadastro e conta</h2>
      <ul>
        <li>Você deve fornecer informações verdadeiras, completas e atualizadas.</li>
        <li>
          O cadastro exige verificação de identidade (documento com foto e CPF). Contas com dados
          falsos ou documentos inválidos podem ser recusadas ou encerradas.
        </li>
        <li>
          As contas de <strong>cliente</strong> e de <strong>profissional</strong> são separadas.
          Você é responsável por manter sua senha em sigilo e por toda atividade na sua conta.
        </li>
        <li>É necessário ser maior de 18 anos (ou ter representação legal) para usar a plataforma.</li>
      </ul>

      <h2>3. Como funciona a contratação</h2>
      <p>
        A negociação acontece pelo chat da Clique, em etapas: conversa → proposta de valor do
        profissional → aceite do cliente → pagamento → liberação dos contatos. O contato direto
        (WhatsApp, e-mail) só é revelado <strong>após o pagamento confirmado</strong>.
      </p>

      <h2>4. Fechar o negócio dentro da plataforma</h2>
      <p>
        Para manter a segurança e o modelo do serviço, você concorda em não tentar burlar a
        plataforma — por exemplo, combinando pagamento por fora ou trocando contatos antes da
        liberação. Mensagens que tentam driblar essa regra podem ser filtradas, e o uso reincidente
        pode levar à suspensão da conta.
      </p>

      <h2>5. Comissão da plataforma</h2>
      <p>
        Sobre cada negócio fechado pela Clique incide uma comissão da plataforma, informada no
        momento do fechamento. O valor combinado na proposta aceita é a base desse cálculo.
      </p>

      <h2>6. Pagamentos</h2>
      <p>
        O meio de pagamento é apresentado no momento do fechamento. A liberação de contato depende da
        confirmação do pagamento. Regras de reembolso e cancelamento serão informadas no fluxo de
        pagamento.
      </p>

      <h2>7. Conteúdo e portfólio</h2>
      <p>
        O portfólio e as informações que você publica continuam sendo seus. Ao publicá-los, você
        autoriza a Clique a exibi-los na plataforma para divulgar o seu trabalho. Você declara ter os
        direitos sobre o que envia e não publicar conteúdo ilícito, ofensivo ou de terceiros sem
        autorização.
      </p>

      <h2>8. Responsabilidades</h2>
      <ul>
        <li>
          A Clique não se responsabiliza pela execução, qualidade ou entrega do serviço contratado
          entre as partes — isso é responsabilidade do profissional e do contratante.
        </li>
        <li>
          A Clique atua de boa-fé para mediar eventuais problemas, mas não garante resultados nem a
          conduta das partes.
        </li>
        <li>
          O serviço é oferecido no estado em que se encontra, podendo passar por manutenção,
          ajustes e evoluções.
        </li>
      </ul>

      <h2>9. Suspensão e encerramento</h2>
      <p>
        Podemos suspender ou encerrar contas que violem estes Termos, apresentem indícios de fraude
        ou coloquem em risco outras pessoas. Você pode encerrar sua conta quando quiser.
      </p>

      <h2>10. Alterações</h2>
      <p>
        Estes Termos podem ser atualizados. Mudanças relevantes serão comunicadas, e o uso contínuo
        após a atualização significa concordância com a nova versão.
      </p>

      <h2>11. Lei aplicável</h2>
      <p>
        Estes Termos são regidos pelas leis do Brasil. Fica eleito o foro do domicílio do consumidor
        para dirimir questões deles decorrentes, conforme o Código de Defesa do Consumidor.
      </p>

      <p className="legal-foot">
        Veja também a{" "}
        <Link href="/privacidade" className="legal-link">
          Política de Privacidade
        </Link>
        .
      </p>
    </div>
  );
}
