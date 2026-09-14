import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const required = ['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SERVICE_ROLE_KEY'];
for (const name of required) if (!process.env[name]) throw new Error('Variável ausente: ' + name);
const app = express();
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{autoRefreshToken:false,persistSession:false}});
app.use(cors({origin: process.env.FRONTEND_URL?.split(',').map(x=>x.trim()) || true}));
app.use(express.json({limit:'1mb'}));

async function auth(req,res,next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i,'');
  if (!token) return res.status(401).json({error:'Não autenticado'});
  const {data:{user},error} = await admin.auth.getUser(token);
  if (error || !user) return res.status(401).json({error:'Sessão inválida'});
  const {data:profile,error:profileError} = await admin.from('usuarios').select('*').eq('id',user.id).single();
  if (profileError || !profile) return res.status(403).json({error:'Usuário sem perfil Linko Obras'});
  req.user = user;
  req.profile = profile;
  req.scoped = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, {
    global: {headers: {Authorization: 'Bearer ' + token}}
  });
  next();
}
const canManage = req => req.profile.tipo === 'gestor';
app.get('/health', (_req,res) => res.json({ok:true,service:'linko-obras-api'}));
app.get('/api/me', auth, async (req,res) => {
  const {data:pending,error} = await req.scoped.rpc('linko_troca_pendente');
  if (error) return res.status(503).json({error:'Execute a migração de primeiro acesso no Supabase'});
  res.json({user:req.user,profile:req.profile,passwordChangeRequired:Boolean(pending),access:!pending});
});
app.get('/api/empresas', auth, async (req,res) => {
  let query=admin.from('empresas').select('*').order('nome');
  if (!canManage(req)) query=query.eq('id',req.profile.empresa_id);
  const {data,error}=await query;
  if (error) return res.status(500).json({error:error.message}); res.json(data);
});
app.get('/api/obras', auth, async (req,res) => {
  let query=admin.from('obras_com_status').select('*').order('atualizado_em',{ascending:false});
  if (!canManage(req)) query=query.eq('empresa_id',req.profile.empresa_id);
  if (req.query.categoria) query=query.eq('categoria',req.query.categoria);
  const {data,error}=await query; if(error)return res.status(500).json({error:error.message}); res.json(data);
});
app.post('/api/obras', auth, async (req,res) => {
  if (req.profile.tipo !== 'gestor' && req.profile.empresa_id == null) return res.status(403).json({error:'Empresa não vinculada'});
  const allowed=['identificacao','categoria','data_recebimento_demanda','data_inicio','data_fim','metragem_cabo','capacidade_cabo','fusoes','canalizacao_metragem','caixas_subterraneas','caixas_emenda','adequacao_rede'];
  const row=Object.fromEntries(allowed.filter(k=>Object.hasOwn(req.body,k)).map(k=>[k,req.body[k]]));
  row.empresa_id=canManage(req)?req.body.empresa_id:req.profile.empresa_id; row.criado_por=req.user.id;
  const {data,error}=await admin.from('obras').insert(row).select('*').single(); if(error)return res.status(400).json({error:error.message}); res.status(201).json(data);
});
app.patch('/api/obras/:id', auth, async (req,res) => {
  const allowed=['identificacao','categoria','data_recebimento_demanda','data_inicio','data_fim','metragem_cabo','capacidade_cabo','fusoes','canalizacao_metragem','caixas_subterraneas','caixas_emenda','adequacao_rede'];
  const row=Object.fromEntries(allowed.filter(k=>Object.hasOwn(req.body,k)).map(k=>[k,req.body[k]]));
  let query=admin.from('obras').update(row).eq('id',req.params.id); if(!canManage(req))query=query.eq('empresa_id',req.profile.empresa_id);
  const {data,error}=await query.select('*').single(); if(error)return res.status(400).json({error:error.message}); res.json(data);
});
app.delete('/api/obras/:id', auth, async (req,res) => {
  if(!canManage(req))return res.status(403).json({error:'Somente gestores podem excluir obras'});
  const {error}=await admin.from('obras').delete().eq('id',req.params.id);
  if(error)return res.status(400).json({error:error.message}); res.status(204).end();
});
app.use((err,_req,res,_next)=>{console.error(err);res.status(500).json({error:'Erro interno'});});
app.listen(process.env.PORT||10000,()=>console.log('Linko Obras API na porta '+(process.env.PORT||10000)));
