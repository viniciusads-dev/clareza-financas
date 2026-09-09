'use client';

import {useState,type FormEvent} from 'react';
import {ArrowRight,Check,Eye,EyeOff,KeyRound,Leaf,LockKeyhole,Mail,ShieldCheck,UserRound} from 'lucide-react';
import Link from 'next/link';
import {login,register,type AuthUser} from './api';

type Mode='login'|'register';

function ClarezaLogo({className=''}:{className?:string}){
  return <Link className={`login-brand ${className}`} href="/" aria-label="Clareza — início">
    <span className="login-brand-icon"><Leaf size={21}/></span>
    <span>clareza<span className="login-brand-dot">.</span></span>
  </Link>;
}

export default function LoginScreen({onAuthenticated}:{onAuthenticated:(user:AuthUser)=>void}){
  const [mode,setMode]=useState<Mode>('login');
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [passwordConfirmation,setPasswordConfirmation]=useState('');
  const [privacyAccepted,setPrivacyAccepted]=useState(false);
  const [showPassword,setShowPassword]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  function switchMode(next:Mode){setMode(next);setError('');setShowPassword(false);}
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setError('');
    if(mode==='register'&&password!==passwordConfirmation){setError('As senhas não coincidem.');return;}
    if(mode==='register'&&!privacyAccepted){setError('Confirme a política de privacidade para criar sua conta.');return;}
    setBusy(true);
    try{const user=mode==='login'?await login(email,password):await register(name,email,password);onAuthenticated(user);}
    catch(exception){setError(exception instanceof Error?exception.message:'Não foi possível concluir agora. Tente novamente.');}
    finally{setBusy(false);}
  }

  const isRegister=mode==='register';
  return <main className="login-page">
    <div className="login-shell">
      <section className="login-story" aria-labelledby="login-story-title">
        <div className="login-story-orbit" aria-hidden="true"/>
        <div className="login-story-content">
          <ClarezaLogo/>
          <div className="login-story-copy">
            <span className="login-kicker">FINANÇAS PESSOAIS, SEM PRESSA</span>
            <h1 id="login-story-title">Seu dinheiro.<br/><em>mais leve.</em></h1>
            <p>Um lugar tranquilo para entender o que entra, o que sai e o que importa para você.</p>
          </div>
          <div className="login-trust-list" aria-label="Compromissos da Clareza">
            <div className="login-trust-item"><span><LockKeyhole size={17}/></span><div><strong>Privado por padrão</strong><small>Seus registros ficam só no seu espaço.</small></div></div>
            <div className="login-trust-item"><span><ShieldCheck size={17}/></span><div><strong>Sem complicação</strong><small>Crie sua conta e comece em poucos passos.</small></div></div>
          </div>
          <div className="login-story-bottom"><span className="login-live-dot" aria-hidden="true"/> Feito para a vida real · um passo de cada vez</div>
        </div>
      </section>

      <section className="login-entry" aria-labelledby="login-title">
        <div className="login-entry-inner">
          <div className="login-mobile-header"><ClarezaLogo/></div>
          <div className="login-card">
            <div className="auth-tabs" role="tablist" aria-label="Acesso à conta">
              <button type="button" role="tab" aria-selected={mode==='login'} className={mode==='login'?'auth-tab active':'auth-tab'} onClick={()=>switchMode('login')}>Entrar</button>
              <button type="button" role="tab" aria-selected={isRegister} className={isRegister?'auth-tab active':'auth-tab'} onClick={()=>switchMode('register')}>Criar conta</button>
            </div>
            <span className="login-eyebrow">SEU ESPAÇO FINANCEIRO</span>
            <h2 id="login-title">{isRegister?'Comece com clareza':'Bem-vindo de volta'}</h2>
            <p className="login-intro">{isRegister?'Uma conta simples para acompanhar seu dinheiro no seu ritmo.':'Entre para acompanhar suas finanças com calma, do seu jeito.'}</p>

            <form className="auth-form" onSubmit={submit} noValidate>
              {isRegister&&<label className="auth-field"><span>Como podemos chamar você?</span><div className="auth-input-wrap"><UserRound size={17}/><input autoFocus name="name" type="text" autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={event=>setName(event.target.value)} placeholder="Seu nome"/></div></label>}
              <label className="auth-field"><span>E-mail</span><div className="auth-input-wrap"><Mail size={17}/><input autoFocus={!isRegister} name="email" type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)} placeholder="voce@exemplo.com"/></div></label>
              <label className="auth-field"><span>Senha</span><div className="auth-input-wrap"><KeyRound size={17}/><input name="password" type={showPassword?'text':'password'} autoComplete={isRegister?'new-password':'current-password'} required minLength={isRegister?8:1} maxLength={128} value={password} onChange={event=>setPassword(event.target.value)} placeholder={isRegister?'Pelo menos 8 caracteres':'Sua senha'}/><button type="button" className="password-toggle" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword?'Ocultar senha':'Mostrar senha'}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>{isRegister&&<small className="auth-field-help">Use uma senha que você não usa em outros sites.</small>}</label>
              {isRegister&&<label className="auth-field"><span>Confirme sua senha</span><div className="auth-input-wrap"><KeyRound size={17}/><input name="passwordConfirmation" type={showPassword?'text':'password'} autoComplete="new-password" required minLength={8} maxLength={128} value={passwordConfirmation} onChange={event=>setPasswordConfirmation(event.target.value)} placeholder="Digite a senha novamente"/></div></label>}
              {isRegister&&<label className="auth-consent"><input type="checkbox" checked={privacyAccepted} onChange={event=>setPrivacyAccepted(event.target.checked)}/><span>Li e aceito a <a href="/privacidade" target="_blank" rel="noreferrer">política de privacidade</a>.</span></label>}
              {error&&<p className="auth-error" role="alert">{error}</p>}
              <button className="login-submit" type="submit" disabled={busy}><span>{busy?(isRegister?'Criando sua conta…':'Entrando…'):(isRegister?'Criar minha conta':'Entrar na Clareza')}</span>{busy?<span className="auth-spinner" aria-hidden="true"/>:<ArrowRight size={19}/>}</button>
            </form>

            <p className="auth-switch">{isRegister?'Já tem uma conta?':'Ainda não tem uma conta?'} <button type="button" onClick={()=>switchMode(isRegister?'login':'register')}>{isRegister?'Entrar':'Criar agora'}</button></p>
            <div className="login-divider"><span>Feito para você ter controle</span></div>
            <div className="login-control-grid">
              <div className="login-control"><Check size={16}/><strong>Começo rápido</strong><span>Cadastre e registre o primeiro passo.</span></div>
              <div className="login-control"><ShieldCheck size={16}/><strong>Dados protegidos</strong><span>Senha protegida e sessão privada.</span></div>
            </div>
            <p className="login-legal">Você pode sair ou excluir seus dados quando quiser. <a href="/privacidade">Saiba mais sobre privacidade</a>.</p>
          </div>
          <footer className="login-footer"><span>© 2026 Clareza</span><span className="login-footer-separator" aria-hidden="true"/> <a href="/privacidade">Privacidade e LGPD</a></footer>
        </div>
      </section>
    </div>
  </main>;
}
