import React, {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createClient} from '@supabase/supabase-js';
import './styles.css';

const cfg = {url: import.meta.env.VITE_SUPABASE_URL, key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, api: import.meta.env.VITE_API_URL};
let supabase = null;
try { if (cfg.url && cfg.key) supabase = createClient(cfg.url, cfg.key); } catch {}
const configured = Boolean(supabase && cfg.api);
const pages = {overview: 'Visão geral', obras: 'Obras', empresas: 'Empresas', acessos: 'Acessos'};
const readPage = () => window.location.hash.slice(1) || 'overview';

export async function request(path, token, signal) {
  const response = await fetch(cfg.api.replace(/\/$/, '') + path, {headers: {Authorization: 'Bearer ' + token}, signal});
  let data;
  try { data = await response.json(); } catch { throw new Error('A API retornou uma resposta inválida.'); }
  if (!response.ok) throw new Error(data?.error || 'Não foi possível concluir a solicitação.');
  return data;
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(readPage);
  const [refresh, setRefresh] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const manager = profile?.profile?.tipo === 'gestor';
  const visiblePage = Object.hasOwn(pages, page) && (manager || !['empresas', 'acessos'].includes(page)) ? page : 'overview';

  useEffect(() => {
    const navigate = () => setPage(readPage());
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return; }
    let active = true;
    const apply = s => {
      if (!active) return;
      setSession(s); setProfile(null); setRows([]); setLoading(Boolean(s)); setAuthReady(true);
    };
    // Auth events take precedence over a pending initial session read.
    let changed = false;
    const {data: {subscription}} = supabase.auth.onAuthStateChange((_event, s) => { changed = true; apply(s); });
    supabase.auth.getSession().then(({data, error: authError}) => {
      if (active && !changed) {
        if (authError) setError('Não foi possível recuperar a sessão. Entre novamente.');
        apply(data?.session || null);
      }
    }).catch(() => {
      if (active && !changed) { setError('Não foi possível recuperar a sessão.'); apply(null); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session || !configured) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError(''); setRows([]);
      try {
        const me = await request('/api/me', session.access_token, controller.signal);
        if (!me?.profile || typeof me.access !== 'boolean') throw new Error('Perfil retornado pela API é inválido.');
        if (controller.signal.aborted) return;
        setProfile(me);
        if (!me.access || me.passwordChangeRequired) return;
        const allowedPage = me.profile.tipo === 'gestor' ? page : (['empresas', 'acessos'].includes(page) ? 'overview' : page);
        const endpoint = allowedPage === 'empresas' ? '/api/empresas' : allowedPage === 'acessos' ? '/api/usuarios' : '/api/obras';
        const data = await request(endpoint, session.access_token, controller.signal);
        if (!Array.isArray(data)) throw new Error('A API retornou uma lista inválida.');
        if (!controller.signal.aborted) setRows(data);
      } catch (e) {
        if (!controller.signal.aborted) setError(e.message || 'Não foi possível carregar o painel.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [session, page, refresh]);

  async function login(e) {
    e.preventDefault();
    if (!configured || busy) return;
    setBusy(true); setError('');
    try {
      const {error: authError} = await supabase.auth.signInWithPassword({email, password});
      if (authError) throw new Error('E-mail ou senha inválidos.');
      setPassword('');
    } catch (e) { setError(e.message || 'Não foi possível entrar.'); }
    finally { setBusy(false); }
  }
  async function change(e) {
    e.preventDefault();
    if (busy) return;
    setError('');
    if (newPassword.length < 12) return setError('A nova senha precisa ter pelo menos 12 caracteres.');
    setBusy(true);
    try {
      const {error: authError} = await supabase.auth.updateUser({password: newPassword});
      if (authError) throw new Error('Não foi possível alterar a senha.');
      setNewPassword(''); setRefresh(n => n + 1);
    } catch (e) { setError(e.message || 'Não foi possível alterar a senha.'); }
    finally { setBusy(false); }
  }
  async function logout() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const {error: authError} = await supabase.auth.signOut();
      if (authError) throw new Error('Não foi possível sair. Tente novamente.');
      setSession(null); setProfile(null); setRows([]); window.location.hash = 'overview';
    } catch (e) { setError(e.message || 'Não foi possível sair.'); }
    finally { setBusy(false); }
  }
  const feedback = error && <p className="error" role="alert">{error}</p>;
  if (!configured) return <main className="auth"><section className="card"><h1>Linko Obras</h1><p role="alert">O serviço de acesso ainda não está configurado. Entre em contato com o administrador.</p></section></main>;
  if (!authReady) return <main className="auth"><section className="card" role="status">Carregando sessão…</section></main>;
  if (!session) return <main className="auth"><form onSubmit={login} className="card"><h1>Linko Obras</h1><p>Gerência Regional Sul</p><label>E-mail<input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required/></label><label>Senha<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required/></label><button disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>{feedback}</form></main>;
  if (profile?.passwordChangeRequired) return <main className="auth"><form onSubmit={change} className="card"><h1>Crie sua nova senha</h1><p>A troca é obrigatória no primeiro acesso.</p><label>Nova senha<input type="password" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={12} required/></label><button disabled={busy}>{busy ? 'Salvando…' : 'Salvar senha'}</button><button type="button" disabled={busy} onClick={logout}>Sair</button>{feedback}</form></main>;

  const worksPage = visiblePage === 'overview' || visiblePage === 'obras';
  const running = rows.filter(w => !w.data_fim && w.data_inicio).length;
  const done = rows.filter(w => w.data_fim).length;
  return <div className="app"><aside><h1>Linko Obras</h1><p>Gerência Regional Sul</p><nav aria-label="Navegação principal">{Object.entries(pages).filter(([id]) => manager || !['empresas', 'acessos'].includes(id)).map(([id, label]) => <a key={id} href={'#' + id} aria-current={visiblePage === id ? 'page' : undefined}>{label}</a>)}</nav><button disabled={busy} onClick={logout}>{busy ? 'Aguarde…' : 'Sair'}</button></aside><main><header><div><span>PAINEL OPERACIONAL</span><h2>{pages[visiblePage]}</h2><p>{manager ? 'Todas as empresas parceiras' : 'Obras da sua empresa'}</p></div><button disabled={loading} onClick={() => setRefresh(n => n + 1)}>{loading ? 'Atualizando…' : 'Atualizar'}</button></header>{feedback}
    {!loading && profile && !profile.access && <p role="alert">Seu acesso ao painel ainda não foi liberado.</p>}
    {visiblePage === 'overview' && profile?.access && !loading && !error && <div className="metrics"><div><span>Obras cadastradas</span><b>{rows.length}</b></div><div><span>Em andamento</span><b>{running}</b></div><div><span>Concluídas</span><b>{done}</b></div></div>}
    <section className="card" aria-busy={loading}><h3>{visiblePage === 'overview' ? 'Obras recentes' : pages[visiblePage]}</h3>{loading ? <p role="status">Carregando…</p> : !error && profile?.access && (rows.length ? <table><thead>{worksPage ? <tr><th>Identificação</th><th>Categoria</th><th>Status</th></tr> : visiblePage === 'empresas' ? <tr><th>Empresa</th><th>Situação</th></tr> : <tr><th>Login</th><th>Perfil</th><th>Equipe</th></tr>}</thead><tbody>{rows.map(row => <tr key={row.id}>{worksPage ? <><td>{row.identificacao}</td><td>{row.categoria}</td><td>{row.status}</td></> : visiblePage === 'empresas' ? <><td>{row.nome}</td><td>{row.ativa ? 'Ativa' : 'Inativa'}</td></> : <><td>{row.login}</td><td>{row.tipo}</td><td>{row.nome_equipe || '—'}</td></>}</tr>)}</tbody></table> : <p>{worksPage ? 'Nenhuma obra cadastrada.' : visiblePage === 'empresas' ? 'Nenhuma empresa cadastrada.' : 'Nenhum acesso cadastrado.'}</p>)}</section>
  </main></div>;
}
createRoot(document.getElementById('root')).render(<App/>);

