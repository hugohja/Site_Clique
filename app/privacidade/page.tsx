import Link from "next/link";
import { PRIVACY_CONTACT, TERMS_UPDATED, TERMS_VERSION } from "@/lib/legal";

export const metadata = { title: "Política de Privacidade — Clique" };

export default function PrivacidadePage() {
  return (
    <div className="container legal">
      <p className="legal-eyebrow mono">
        Política de Privacidade · {TERMS_VERSION} · atualizado em {TERMS_UPDATED}
      </p>
      <h1>Política de Privacidade</h1>
      <p className="legal-lead">
        Esta política explica como a Clique trata seus dados pessoais, em conformidade com a Lei
        Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD). Coletamos apenas o necessário para
        operar a plataforma com segurança, e dados sensíveis como CPF e documento nunca ficam
        públicos.
      </p>

      <h2>1. Quem é o controlador</h2>
      <p>
        A Clique é a controladora dos dados tratados na plataforma. Para questões de privacidade,
        fale com o encarregado pelo tratamento de dados em <strong>{PRIVACY_CONTACT}</strong>.
      </p>

      <h2>2. Dados que coletamos</h2>
      <ul>
        <li>
          <strong>Cadastro (públicos ou semipúblicos):</strong> nome, cidade, tipo de profissional,
          especialidades, foto de perfil e portfólio (para profissionais).
        </li>
        <li>
          <strong>Contato (privado):</strong> e-mail de login e número de WhatsApp — só revelados à
          outra parte após o pagamento confirmado.
        </li>
        <li>
          <strong>Identidade (dados sensíveis, privados):</strong> CPF, foto de documento oficial,
          gênero e data de nascimento, usados para verificação e segurança.
        </li>
        <li>
          <strong>Uso da plataforma:</strong> mensagens do chat, propostas, valores fechados e dados
          técnicos de acesso (como o cookie de sessão).
        </li>
      </ul>

      <h2>3. Para que usamos</h2>
      <ul>
        <li>Operar a plataforma e permitir a busca, o contato e a contratação.</li>
        <li>Verificar identidade e aumentar a segurança e a confiança entre as partes.</li>
        <li>Prevenir fraudes e o uso indevido do serviço.</li>
        <li>Processar o fechamento do negócio e a comissão.</li>
        <li>Cumprir obrigações legais, fiscais e regulatórias.</li>
      </ul>

      <h2>4. Base legal (LGPD, art. 7º e 11)</h2>
      <p>
        Tratamos seus dados com base na execução do contrato (uso do serviço), no seu
        consentimento (coletado no cadastro, em especial para os dados sensíveis de identidade), no
        cumprimento de obrigação legal e no legítimo interesse de prevenir fraudes e manter a
        segurança da plataforma.
      </p>

      <h2>5. Dados sensíveis (documento e CPF)</h2>
      <p>
        O CPF e a foto do documento são tratados com proteção reforçada: ficam em armazenamento com
        acesso restrito (a foto do documento fica em área privada, nunca pública), são usados apenas
        para verificação de identidade e obrigações legais, e nunca aparecem em telas públicas nem
        são compartilhados com outros usuários.
      </p>

      <h2>6. Com quem compartilhamos</h2>
      <ul>
        <li>
          <strong>Com a outra parte da negociação:</strong> apenas o necessário, e o contato direto
          só após o pagamento confirmado.
        </li>
        <li>
          <strong>Com prestadores de infraestrutura</strong> que operam sob nossas instruções (por
          exemplo, hospedagem e banco de dados), no mínimo necessário para o serviço funcionar.
        </li>
        <li>
          <strong>Com autoridades</strong> quando exigido por lei ou ordem judicial.
        </li>
      </ul>
      <p>Não vendemos seus dados pessoais.</p>

      <h2>7. Segurança</h2>
      <p>
        Adotamos medidas técnicas e organizacionais para proteger seus dados: senhas guardadas como
        hash (nunca em texto puro), documentos em área de armazenamento privada, acesso restrito aos
        dados sensíveis e comunicação criptografada. Nenhum sistema é 100% imune, mas trabalhamos
        para reduzir riscos.
      </p>

      <h2>8. Por quanto tempo guardamos</h2>
      <p>
        Mantemos seus dados enquanto sua conta existir e pelo prazo necessário para cumprir
        obrigações legais e fiscais ou resolver disputas. Depois disso, os dados são eliminados ou
        anonimizados.
      </p>

      <h2>9. Seus direitos (LGPD, art. 18)</h2>
      <p>Você pode, a qualquer momento:</p>
      <ul>
        <li>confirmar a existência de tratamento e acessar seus dados;</li>
        <li>corrigir dados incompletos, inexatos ou desatualizados;</li>
        <li>solicitar anonimização, bloqueio ou eliminação de dados desnecessários;</li>
        <li>solicitar a portabilidade dos dados;</li>
        <li>revogar o consentimento e pedir a exclusão dos dados tratados com base nele;</li>
        <li>obter informação sobre com quem compartilhamos seus dados.</li>
      </ul>
      <p>
        Para exercer esses direitos, entre em contato pelo endereço informado no item 1. Podemos
        precisar confirmar sua identidade antes de atender ao pedido.
      </p>

      <h2>10. Cookies</h2>
      <p>
        Usamos um cookie de sessão essencial para manter você conectado. Sem ele, o login não
        funciona. Não usamos cookies de publicidade de terceiros nesta fase.
      </p>

      <h2>11. Alterações</h2>
      <p>
        Esta política pode ser atualizada. Mudanças relevantes serão comunicadas na plataforma, com
        indicação da nova data de vigência.
      </p>

      <p className="legal-foot">
        Veja também os{" "}
        <Link href="/termos" className="legal-link">
          Termos de Uso
        </Link>
        .
      </p>
    </div>
  );
}
