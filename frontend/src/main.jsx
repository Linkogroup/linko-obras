import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createClient} from '@supabase/supabase-js';
import './styles.css';

const cfg={url:import.meta.env.VITE_SUPABASE_URL,key:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,api:import.meta.env.VITE_API_URL};
const supabase=cfg.url&&cfg.key?createClient(cfg.url,cfg.key):null;
function App(){
 const [session,setSession]=useState(null),[profile,setProfile]=useState(null),[works,setWorks]=useState([]),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[newPassword,setNewPassword]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 useEffect(()=>{supabase?.auth.getSession().then(({data})=>setSession(data.session));const sub=supabase?.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>sub?.data.subscription.unsubscribe()},[]);
 useEffect(()=>{if(session)load()},[session]);
 async function load(){setLoading(true);try{const h={Authorization:'Bearer '+session.access_token};const me=await fetch(cfg.api+'/api/me',{headers:h}).then(r=>r.json());setProfile(me);if(me.access)setWorks(await fetch(cfg.api+'/api/obras',{headers:h}).then(r=>r.json()))}catch(e){setError('Não foi possível carregar o painel.')}finally{setLoading(false)}}
 async function login(e){e.preventDefault();setError('');const {error}=await supabase.auth.signInWithPassword({email,password});if(error)setError('E-mail ou senha inválidos.')}
 async function change(e){e.preventDefault();setError('');if(newPassword.length<12)return setError('A nova senha precisa ter pelo menos 12 caracteres.');const {error}=await supabase.auth.updateUser({password:newPassword});if(error)setError('Não foi possível alterar a senha.');else load()}
 if(!session)return <main className="auth"><form onSubmit={login} className="card"><h1>Linko Obras</h1><p>Gerência Regional Sul</p><label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Senha<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><button>Entrar</button><small>{error}</small></form></main>;
 if(profile?.passwordChangeRequired)return <main className="auth"><form onSubmit={change} className="card"><h1>Crie sua nova senha</h1><p>A troca é obrigatória no primeiro acesso.</p><label>Nova senha<input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} minLength="12" required/></label><button>Salvar senha</button><small>{error}</small></form></main>;
 const running=works.filter(w=>!w.data_fim&&w.data_inicio).length,done=works.filter(w=>w.data_fim).length;
 return <div className="app"><aside><h1>Linko Obras</h1><p>Gerência Regional Sul</p><nav>Visão geral<br/>Obras<br/>{profile?.profile?.tipo==='gestor'&&<>Empresas<br/>Acessos</>}</nav><button onClick={()=>supabase.auth.signOut()}>Sair</button></aside><main><header><div><span>PAINEL OPERACIONAL</span><h2>Visão geral</h2><p>{profile?.profile?.tipo==='gestor'?'Todas as empresas parceiras':'Obras da sua empresa'}</p></div><button onClick={load}>Atualizar</button></header><div className="metrics"><div><span>Obras cadastradas</span><b>{works.length}</b></div><div><span>Em andamento</span><b>{running}</b></div><div><span>Concluídas</span><b>{done}</b></div></div><section className="card"><h3>Obras recentes</h3>{loading?<p>Carregando…</p>:works.length?<table><thead><tr><th>Identificação</th><th>Categoria</th><th>Status</th></tr></thead><tbody>{works.map(w=><tr key={w.id}><td>{w.identificacao}</td><td>{w.categoria}</td><td>{w.status}</td></tr>)}</tbody></table>:<p>Nenhuma obra cadastrada.</p>}{error&&<small>{error}</small>}</section></main></div>
}
createRoot(document.getElementById('root')).render(<App/>);
