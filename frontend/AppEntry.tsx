'use client';

import {lazy,Suspense,useEffect,useState} from 'react';
import LoginScreen from './LoginScreen';
import {getSession,type AuthUser} from './api';

const FinanceApp=lazy(()=>import('./FinanceApp'));
function SessionLoading(){return <main className="auth-loading" aria-label="Verificando sua sessão"><span className="auth-loading-mark">✦</span><span>Preparando seu espaço…</span></main>;}

export default function AppEntry(){
  const [user,setUser]=useState<AuthUser|null>(null);
  const [checking,setChecking]=useState(true);
  useEffect(()=>{getSession().then(setUser).catch(()=>setUser(null)).finally(()=>setChecking(false));},[]);
  if(checking)return <SessionLoading/>;
  return user?<Suspense fallback={<SessionLoading/>}><FinanceApp user={user} onLogout={()=>setUser(null)}/></Suspense>:<LoginScreen onAuthenticated={setUser}/>;
}
