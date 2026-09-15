import express from 'express';
import cors from 'cors';
import {payload, summarize, categories} from './obras.js';

export function createApp({admin, scopedClient, frontendUrl}) {
  const app = express();
  app.use(cors({origin:frontendUrl?.split(',').map(x=>x.trim()) || true}));
  app.use(express.json({limit:'1mb'}));
  async function auth(req,res,next) {
    const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return res.status(401).json({error:'Não autenticado.'});
    const {data:{user},error} = await admin.auth.getUser(token);
    if (error || !user) return res.status(401).json({error:'Sessão inválida.'});
    const {data:profile,error:profileError} = await admin.from('usuarios').select('*').eq('id',user.id).single();
    if (profileError || !profile || !['gestor','empresa'].includes(profile.tipo)) return res.status(403).json({error:'Usuário sem perfil Linko Obras.'});
    req.user=user; req.profile=profile; req.scoped=scopedClient(token);
    next();
  }
  async function access(req,res,next) {
    const {data,error} = await req.scoped.rpc('linko_acesso_liberado');
    if (error) return res.status(503).json({error:'Não foi possível verificar a liberação do acesso.'});
    if (data !== true) return res.status(403).json({error:'Acesso bloqueado. Verifique a troca de senha e a situação da empresa.'});
    next();
  }
  const manager = req => req.profile.tipo === 'gestor';
  const validId = id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  function databaseError(res,error) {
    if (error.code === 'P0001' && /material|materiais|Quantidade deve|lançamentos|modelo, unidade/.test(error.message || '')) return res.status(400).json({error:error.message});
    if (error.code === '23505') return res.status(409).json({error:'Este ID/OBRA Linko já está cadastrado.'});
    if (error.code === '42501') return res.status(403).json({error:'Seu perfil não permite esta operação.'});
    if (['23502','23503','23514','22P02','22007','22008','P0001'].includes(error.code)) return res.status(400).json({error:'Confira os campos, a empresa e a ordem das datas da obra.'});
    console.error(error);
    return res.status(500).json({error:'Não foi possível concluir a operação.'});
  }
  // Paginação com o token do usuário preserva as regras de acesso nos relatórios.
  async function allRows(makeQuery) {
    const rows=[];
    for (let offset=0;;offset+=500) {
      const {data,error}=await makeQuery().range(offset,offset+499);
      if(error) throw error;
      rows.push(...data);
      if(data.length<500) return rows;
    }
  }
  app.get('/health',(_req,res)=>res.json({ok:true,service:'linko-obras-api'}));
  app.get('/api/me',auth,async(req,res)=>{
    const [pending,allowed]=await Promise.all([req.scoped.rpc('linko_troca_pendente'),req.scoped.rpc('linko_acesso_liberado')]);
    if(pending.error || allowed.error) return res.status(503).json({error:'Execute as migrações de acesso no Supabase.'});
    res.json({user:{id:req.user.id,email:req.user.email},profile:req.profile,passwordChangeRequired:pending.data !== false,access:allowed.data === true});
  });
  app.use('/api',auth,access);
  app.get('/api/materiais',async(req,res)=>{
    try { res.json(await allRows(()=>req.scoped.from('materiais_catalogo').select('id,modelo').order('modelo').order('id'))); }
    catch(error) { databaseError(res,error); }
  });
  app.get('/api/usuarios',async(req,res)=>{
    if(!manager(req)) return res.status(403).json({error:'Somente gestores podem consultar acessos.'});
    try { res.json(await allRows(()=>req.scoped.from('usuarios').select('id,login,tipo,nome_equipe').order('login').order('id'))); }
    catch(error) { databaseError(res,error); }
  });
  app.get('/api/empresas',async(req,res)=>{
    try { res.json(await allRows(()=>{
      let q=req.scoped.from('empresas').select('*').order('nome').order('id');
      return manager(req) ? q : q.eq('id',req.profile.empresa_id);
    })); } catch(error) { databaseError(res,error); }
  });
  async function readWorks(req,res,reports=false) {
    if(req.query.empresa_id && (!validId(req.query.empresa_id) || (!manager(req) && req.query.empresa_id !== req.profile.empresa_id))) return res.status(403).json({error:'Empresa não permitida.'});
    if(req.query.categoria && !categories.includes(req.query.categoria)) return res.status(400).json({error:'Categoria inválida.'});
    if(req.query.status && !['pendente','em_andamento','concluida'].includes(req.query.status)) return res.status(400).json({error:'Status inválido.'});
    for(const key of ['de','ate']) if(req.query[key]) {
      try { payload({data_recebimento_demanda:req.query[key]},false); }
      catch { return res.status(400).json({error:'Período inválido.'}); }
    }
    if(req.query.de && req.query.ate && req.query.de>req.query.ate) return res.status(400).json({error:'O início do período deve anteceder o fim.'});
    try {
      const rows=await allRows(()=>{
        let q=req.scoped.from('obras_com_status').select('*').order('criado_em',{ascending:false}).order('id');
        if(!manager(req)) q=q.eq('empresa_id',req.profile.empresa_id);
        else if(req.query.empresa_id) q=q.eq('empresa_id',req.query.empresa_id);
        for(const key of ['categoria','status']) if(req.query[key]) q=q.eq(key,req.query[key]);
        if(req.query.de) q=q.gte('data_recebimento_demanda',req.query.de);
        if(req.query.ate) q=q.lte('data_recebimento_demanda',req.query.ate);
        return q;
      });
      res.json(reports ? {resumo:summarize(rows),obras:rows} : rows);
    } catch(error) { databaseError(res,error); }
  }
  app.get('/api/obras',(req,res)=>readWorks(req,res));
  app.get('/api/relatorios',(req,res)=>readWorks(req,res,true));
  app.post('/api/obras',async(req,res)=>{
    let row;
    try { row=payload(req.body,manager(req),true); }
    catch(e) { return res.status(400).json({error:e.message}); }
    row.empresa_id=manager(req)?row.empresa_id:req.profile.empresa_id;
    if(!validId(row.empresa_id)) return res.status(400).json({error:'Selecione uma empresa válida.'});
    row.criado_por=req.user.id;
    const {data,error}=await req.scoped.from('obras').insert(row).select('*').single();
    if(error) return databaseError(res,error);
    res.status(201).json(data);
  });
  app.patch('/api/obras/:id',async(req,res)=>{
    if(!validId(req.params.id)) return res.status(400).json({error:'Obra inválida.'});
    let row;
    try { row=payload(req.body,manager(req)); }
    catch(e) { return res.status(400).json({error:e.message}); }
    if(row.empresa_id && !validId(row.empresa_id)) return res.status(400).json({error:'Empresa inválida.'});
    let query=req.scoped.from('obras').update(row).eq('id',req.params.id);
    if(!manager(req)) query=query.eq('empresa_id',req.profile.empresa_id);
    const {data,error}=await query.select('*').maybeSingle();
    if(error) return databaseError(res,error);
    if(!data) return res.status(404).json({error:'Obra não encontrada ou não permitida.'});
    res.json(data);
  });
  app.delete('/api/obras/:id',async(req,res)=>{
    if(!manager(req)) return res.status(403).json({error:'Somente gestores podem excluir obras.'});
    if(!validId(req.params.id)) return res.status(400).json({error:'Obra inválida.'});
    const {data,error}=await req.scoped.from('obras').delete().eq('id',req.params.id).select('id').maybeSingle();
    if(error) return databaseError(res,error);
    if(!data) return res.status(404).json({error:'Obra não encontrada.'});
    res.status(204).end();
  });
  app.use((err,_req,res,_next)=>{console.error(err);res.status(err.status===400?400:500).json({error:err.status===400?'Requisição inválida.':'Erro interno.'});});
  return app;
}
