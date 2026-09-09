'use client';

import {useEffect,useState} from 'react';
import FinanceApp from './FinanceApp';
import LoginScreen from './LoginScreen';
import {getSession,type AuthUser} from './api';

export default function AppEntry(){
  const [user,setUser]=useState<AuthUser|null>(null);
  const [checking,setChecking]=useState(true);
  useEffect(()=>{getSession().then(setUser).catch(()=>setUser(null)).finally(()=>setChecking(false));},[]);
  if(checking)return <main className="auth-loading" aria-label="Verificando sua sessão"><span className="auth-loading-mark">✦</span><span>Preparando seu espaço…</span></main>;
  return user?<FinanceApp user={user} onLogout={()=>setUser(null)}/>:<LoginScreen onAuthenticated={setUser}/>;
}
