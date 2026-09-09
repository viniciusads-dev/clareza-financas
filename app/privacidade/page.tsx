import {ArrowLeft,Database,EyeOff,Leaf,LockKeyhole,ShieldCheck} from 'lucide-react';
import Link from 'next/link';

export const metadata={
  title:'Política de privacidade · Clareza',
  description:'Como a Clareza trata os dados usados no seu espaço de finanças pessoais.',
};

export default function PrivacyPage(){
  return <main className="privacy-page">
    <div className="privacy-page-inner">
      <header className="privacy-page-top">
        <Link className="login-brand privacy-brand" href="/" aria-label="Voltar para a Clareza"><span className="login-brand-icon"><Leaf size={21}/></span><span>clareza<span className="login-brand-dot">.</span></span></Link>
        <Link className="privacy-back" href="/"><ArrowLeft size={16}/> Voltar para o acesso</Link>
      </header>

      <section className="privacy-page-header">
        <span className="login-eyebrow">PRIVACIDADE · LGPD</span>
        <h1>Política de privacidade</h1>
        <p>Transparência sobre os dados que entram na Clareza, por que eles são usados e como você pode manter o controle.</p>
        <span className="privacy-updated">Última atualização: 8 de setembro de 2026</span>
      </section>

      <div className="privacy-page-layout">
        <aside className="privacy-page-aside">
          <strong>Nesta página</strong>
          <nav aria-label="Seções da política">
            <a href="#dados">Dados coletados</a>
            <a href="#finalidades">Finalidades</a>
            <a href="#seguranca">Segurança</a>
            <a href="#direitos">Seus direitos</a>
            <a href="#contato">Contato</a>
          </nav>
        </aside>

        <article className="privacy-document">
          <section><h2>Uma relação clara com seus dados</h2><p>A Clareza foi pensada para ajudar você a organizar a vida financeira sem pedir mais informação do que precisa. Esta política explica o tratamento dos dados no aplicativo e deve ser lida junto dos termos aplicáveis ao serviço.</p></section>
          <section id="dados"><div className="privacy-section-icon"><Database size={18}/></div><h2>1. Quais dados são coletados</h2><p><strong>Dados de acesso:</strong> nome e e-mail informados no cadastro, além de uma derivação criptográfica da sua senha. A senha original nunca é armazenada.</p><p><strong>Dados financeiros:</strong> contas, cartões cadastrados manualmente, lançamentos, orçamentos e metas que você decide registrar.</p><p><strong>Preferências locais:</strong> somente preferências de visualização, como ocultar valores e ativar o modo foco, podem ser guardadas no seu dispositivo.</p></section>
          <section id="finalidades"><div className="privacy-section-icon"><EyeOff size={18}/></div><h2>2. Para que usamos esses dados</h2><p>Usamos os dados para autenticar seu acesso, mostrar seus próprios registros, calcular saldos e indicadores do painel, permitir exportação e atender ações que você solicita, como editar ou excluir um registro.</p><p>Não usamos seus registros para publicidade comportamental, não vendemos seus dados e não solicitamos credenciais de banco. A versão atual não se conecta automaticamente a instituições financeiras.</p></section>
          <section id="seguranca"><div className="privacy-section-icon"><LockKeyhole size={18}/></div><h2>3. Segurança e retenção</h2><p>O acesso ao painel depende de uma sessão criada após o cadastro ou login. Cada consulta e alteração é vinculada ao seu identificador, e respostas com dados pessoais não são armazenadas em cache público.</p><p>As senhas são protegidas com derivação criptográfica e as sessões usam cookies HttpOnly. Os registros permanecem enquanto forem necessários para oferecer o espaço ou até que você solicite sua exclusão, respeitadas eventuais obrigações legais de retenção.</p></section>
          <section id="direitos"><div className="privacy-section-icon"><ShieldCheck size={18}/></div><h2>4. Seus direitos</h2><p>Nos limites previstos na LGPD, você pode solicitar confirmação da existência de tratamento, acesso, correção, portabilidade quando aplicável, anonimização, bloqueio ou eliminação de dados desnecessários, além de informações sobre o tratamento.</p><p>Você também pode revogar um consentimento quando essa for a base legal do tratamento. A revogação não invalida os tratamentos realizados anteriormente e pode afetar a disponibilidade de algumas funções.</p></section>
          <section id="contato"><h2>5. Controlador e contato</h2><p>O responsável pelo serviço Clareza deve manter nesta seção sua identificação legal, endereço e canal de privacidade atualizados antes de disponibilizar o produto publicamente. Para exercer seus direitos, use o canal de suporte indicado dentro do seu espaço ou o contato informado pelo operador do serviço.</p><div className="privacy-production-note"><strong>Nota para publicação</strong><span>Preencha os dados reais do controlador e do canal de atendimento antes do uso em produção.</span></div></section>
        </article>
      </div>

      <footer className="privacy-page-footer"><span><ShieldCheck size={15}/> Privacidade faz parte do produto.</span><Link href="/">Voltar para entrar</Link></footer>
    </div>
  </main>;
}
