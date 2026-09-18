'use client';

import {lazy,Suspense,useCallback,useEffect,useState} from 'react';
import LoginScreen from './LoginScreen';
import {getSession,type AuthUser} from './api';
import AuthSessionError from './components/finance/AuthSessionError';

const FinanceApp=lazy(()=>import('./FinanceApp'));
function SessionLoading(){return <main className="auth-loading" aria-label="Verificando sua sessão"><span className="auth-loading-mark">✦</span><span>Preparando seu espaço…</span></main>;}

type SessionState=
  | {status:'checking'}
  | {status:'authenticated';user:AuthUser}
  | {status:'unauthenticated'}
  | {status:'error';message:string};

export default function AppEntry(){
  const [session,setSession]=useState<SessionState>({status:'checking'});
  const checkSession=useCallback(async()=>{
    setSession({status:'checking'});
    try{
      const user=await getSession();
      setSession(user?{status:'authenticated',user}:{status:'unauthenticated'});
    }catch(error){
      setSession({status:'error',message:error instanceof Error?error.message:'Não foi possível verificar sua sessão.'});
    }
  },[]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{void checkSession();},[checkSession]);
  if(session.status==='checking')return <SessionLoading/>;
  if(session.status==='error')return <AuthSessionError message={session.message} onRetry={()=>void checkSession()}/>;
  if(session.status==='authenticated')return <Suspense fallback={<SessionLoading/>}><FinanceApp user={session.user} onLogout={()=>setSession({status:'unauthenticated'})}/></Suspense>;
  return <LoginScreen onAuthenticated={(user)=>setSession({status:'authenticated',user})}/>;
}
