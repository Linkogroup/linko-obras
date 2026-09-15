import React, {useEffect, useRef, useState} from 'react';
import {exportCsv} from './reports.js';
import {MaterialEditor,MaterialSummary} from './materiais.jsx';
import {materialTotals} from './material-totals.js';

export const categories = {rede_gpon:'Rede GPON',adequacao_predial:'Adequação predial',sites:'Sites',instalacao_cliente:'Instalação cliente',instalacao_b2b:'Instalação B2B',backbone:'Backbone'};
const statuses = {pendente:'Pendente',em_andamento:'Em andamento',concluida:'Concluída'};
const quantities = {metragem_cabo:'Metragem de cabo (m)',fusoes:'Fusões',canalizacao_metragem:'Canalização (m)',caixas_subterraneas:'Caixas subterrâneas',caixas_emenda:'Caixas de emenda',adequacao_rede:'Adequações de rede'};
const date = value => value ? value.slice(0,10).split('-').reverse().join('/') : '—';
const number = value => Number(value || 0).toLocaleString('pt-BR',{maximumFractionDigits:2});
const initialFilters = {empresa_id:'',categoria:'',status:'',de:'',ate:''};

function WorkForm({work,manager,companies,catalog,onSave,onCancel,busy,error}) {
  const [form,setForm] = useState(()=>({...work}));
  const [materials,setMaterials]=useState(()=>(work.materiais||[]).map(r=>({...r,rowKey:crypto.randomUUID()})));
  const [materialError,setMaterialError]=useState('');
  const set = (key,value) => setForm(current=>({...current,[key]:value}));
  function submit(e) {
    e.preventDefault();
    if ((form.materiais_obrigatorios&&!materials.length) || materialTotals(materials).incomplete) {
      setMaterialError('Preencha modelo, medida e quantidade positiva em todos os materiais. O preenchimento obrigatório exige ao menos um lançamento.'); return;
    }
    setMaterialError('');
    const body={};
    body.materiais=materials.map(({material_id,unidade,quantidade})=>({material_id,unidade,quantidade:Number(quantidade)}));
    if(manager) body.materiais_obrigatorios=Boolean(form.materiais_obrigatorios);
    for(const key of ['identificacao','categoria','data_recebimento_demanda','data_inicio','data_fim','capacidade_cabo']) body[key]=form[key] || null;
    for(const key of Object.keys(quantities)) body[key]=form[key] === '' || form[key] == null ? null : Number(form[key]);
    if(manager) { body.empresa_id=form.empresa_id; if(work.id) body.id_linko=form.id_linko; }
    onSave(body);
  }
  return <section className="card work-editor" aria-labelledby="editor-title"><h3 id="editor-title">{work.id ? 'Editar obra' : 'Cadastrar obra'}</h3><form onSubmit={submit}>
    <fieldset disabled={busy}><div className="form-grid">
      <label>ID/OBRA Linko<input value={form.id_linko || ''} placeholder="Gerado automaticamente ao salvar" readOnly={!manager || !work.id} required={Boolean(work.id)} pattern={'[A-Z0-9][A-Z0-9_\\-]{2,63}'} maxLength={64} onChange={e=>set('id_linko',e.target.value)}/><small>{work.id ? (manager ? 'Código único da obra.' : 'Este código só pode ser alterado pelo gestor.') : 'Cada cadastro recebe um código único, como LINKO-000001.'}</small></label>
      {manager ? <label>Empresa<select required value={form.empresa_id || ''} onChange={e=>set('empresa_id',e.target.value)}><option value="">Selecione</option>{companies.map(c=><option key={c.id} value={c.id}>{c.nome}{!c.ativa ? ' (inativa)' : ''}</option>)}</select></label> : <label>Empresa<input readOnly value={companies[0]?.nome || 'Sua empresa'}/></label>}
      <label>Identificação da obra<input autoFocus required maxLength={500} value={form.identificacao || ''} onChange={e=>set('identificacao',e.target.value)}/></label>
      <label>Categoria<select required value={form.categoria || ''} onChange={e=>set('categoria',e.target.value)}><option value="">Selecione</option>{Object.entries(categories).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label>Recebimento da demanda<input type="date" required value={form.data_recebimento_demanda || ''} onChange={e=>set('data_recebimento_demanda',e.target.value)}/></label>
      <label>Data de início<input type="date" min={form.data_recebimento_demanda || undefined} max={form.data_fim || undefined} required={Boolean(form.data_fim)} value={form.data_inicio || ''} onChange={e=>set('data_inicio',e.target.value)}/></label>
      <label>Data de término<input type="date" min={form.data_inicio || form.data_recebimento_demanda || undefined} value={form.data_fim || ''} onChange={e=>set('data_fim',e.target.value)}/></label>
      <label>Capacidade do cabo<input maxLength={500} value={form.capacidade_cabo || ''} onChange={e=>set('capacidade_cabo',e.target.value)}/></label>
      {Object.entries(quantities).map(([key,label])=><label key={key}>{label}<input type="number" min="0" step={['metragem_cabo','canalizacao_metragem'].includes(key)?'any':'1'} value={form[key] ?? ''} onChange={e=>set(key,e.target.value)}/></label>)}
    </div><MaterialEditor items={materials} onChange={setMaterials} catalog={catalog} manager={manager} required={Boolean(form.materiais_obrigatorios)} onRequiredChange={v=>set('materiais_obrigatorios',v)}/></fieldset>
    {materialError&&<p className="error" role="alert">{materialError}</p>}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="actions"><button disabled={busy}>{busy?'Salvando…':'Salvar obra'}</button><button type="button" className="secondary" disabled={busy} onClick={onCancel}>Cancelar</button></div>
  </form></section>;
}

export function ObrasPanel({token,manager,page,request}) {
  const reports=page==='relatorios';
  const [rows,setRows]=useState([]), [companies,setCompanies]=useState([]), [summary,setSummary]=useState(null);
  const [filters,setFilters]=useState(initialFilters), [applied,setApplied]=useState(initialFilters);
  const [loading,setLoading]=useState(true), [error,setError]=useState(''), [notice,setNotice]=useState('');
  const [editor,setEditor]=useState(null), [deleting,setDeleting]=useState(null), [busy,setBusy]=useState(false), [saveError,setSaveError]=useState('');
  const [refresh,setRefresh]=useState(0);
  const [catalog,setCatalog]=useState([]), [catalogError,setCatalogError]=useState(''), [catalogLoading,setCatalogLoading]=useState(true);
  useEffect(()=>{
    const controller=new AbortController(); setCatalogLoading(true); setCatalogError('');setCatalog([]);
    request('/api/materiais',token,controller.signal).then(data=>{
      if(!Array.isArray(data)||!data.length) throw new Error('Catálogo de materiais indisponível.');
      if(!controller.signal.aborted)setCatalog(data);
    }).catch(e=>{if(!controller.signal.aborted)setCatalogError(e.message);})
      .finally(()=>{if(!controller.signal.aborted)setCatalogLoading(false);});
    return()=>controller.abort();
  },[token,request,refresh]);
  const alive=useRef(true);
  useEffect(()=>{alive.current=true; return()=>{alive.current=false;};},[]);
  useEffect(()=>{
    const controller=new AbortController();
    setLoading(true); setError(''); setRows([]); setSummary(null);
    const query=new URLSearchParams(Object.entries(applied).filter(([,v])=>v));
    Promise.all([request((reports?'/api/relatorios':'/api/obras')+'?'+query,token,controller.signal),request('/api/empresas',token,controller.signal)])
      .then(([data,items])=>{
        if(controller.signal.aborted) return;
        if(!Array.isArray(reports?data.obras:data) || !Array.isArray(items)) throw new Error('Resposta inválida do servidor.');
        setRows(reports?data.obras:data); setSummary(reports?data.resumo:null); setCompanies(items);
      }).catch(e=>{if(!controller.signal.aborted)setError(e.message);})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[token,reports,applied,refresh,request]);
  async function save(body) {
    if(busy) return;
    setBusy(true); setSaveError(''); setNotice('');
    try {
      const saved=await request('/api/obras'+(editor.id?'/'+editor.id:''),token,undefined,{method:editor.id?'PATCH':'POST',body:JSON.stringify(body)});
      if(alive.current) {setEditor(null); setNotice('Obra '+saved.id_linko+' salva com sucesso.'); setRefresh(n=>n+1);}
    } catch(e) {if(alive.current)setSaveError(e.message);}
    finally {if(alive.current)setBusy(false);}
  }
  async function remove() {
    if(busy || !manager) return;
    setBusy(true); setSaveError(''); setNotice('');
    try {
      await request('/api/obras/'+deleting.id,token,undefined,{method:'DELETE'});
      if(alive.current) {setDeleting(null); setNotice('Obra excluída.'); setRefresh(n=>n+1);}
    } catch(e) {if(alive.current)setSaveError(e.message);}
    finally {if(alive.current)setBusy(false);}
  }
  const metrics=summary || {total:rows.length,pendentes:rows.filter(r=>!r.data_inicio&&!r.data_fim).length,em_andamento:rows.filter(r=>r.data_inicio&&!r.data_fim).length,concluidas:rows.filter(r=>r.data_fim).length};
  return <>
    <div className="actions toolbar">{!reports && <button disabled={loading||busy||Boolean(error)||catalogLoading||Boolean(catalogError)} onClick={()=>{setEditor({});setDeleting(null);setSaveError('');}}>Cadastrar obra</button>}{!reports && <a className="button secondary" href="#relatorios">Relatórios gerenciais</a>}{reports && <button disabled={loading||Boolean(error)||!rows.length} onClick={()=>exportCsv(rows,categories,statuses,catalog)}>Exportar CSV</button>}</div>
    {catalogLoading&&<p role="status">Carregando catálogo de materiais…</p>}
    {catalogError&&<p className="error" role="alert">Não foi possível carregar os materiais: {catalogError} <button type="button" onClick={()=>setRefresh(n=>n+1)}>Tentar novamente</button></p>}
    {reports&&!loading&&!error&&catalog.length>0&&<section className="card"><h3>Materiais no período</h3><MaterialSummary items={rows.flatMap(r=>r.materiais||[])} catalog={catalog}/></section>}
    {notice && <p className="success" role="status">{notice}</p>}
    {editor && <WorkForm key={editor.id||'new'} work={editor} manager={manager} companies={companies} catalog={catalog} onSave={save} onCancel={()=>setEditor(null)} busy={busy} error={saveError}/>}
    {deleting && <section className="card deletion" aria-labelledby="delete-title"><h3 id="delete-title">Excluir {deleting.id_linko}?</h3><p>A obra “{deleting.identificacao}” e seus registros de anexos serão removidos permanentemente.</p>{saveError && <p className="error" role="alert">{saveError}</p>}<div className="actions"><button className="danger" disabled={busy} onClick={remove}>{busy?'Excluindo…':'Confirmar exclusão'}</button><button className="secondary" disabled={busy} onClick={()=>setDeleting(null)}>Cancelar</button></div></section>}
    <form className="card filters" onSubmit={e=>{e.preventDefault();setApplied({...filters});}}>
      <div className="form-grid">{manager && <label>Empresa<select value={filters.empresa_id} onChange={e=>setFilters({...filters,empresa_id:e.target.value})}><option value="">Todas as empresas</option>{companies.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>}
        <label>Categoria<select value={filters.categoria} onChange={e=>setFilters({...filters,categoria:e.target.value})}><option value="">Todas as categorias</option>{Object.entries(categories).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        <label>Status<select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="">Todos os status</option>{Object.entries(statuses).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        <label>Recebimento a partir de<input type="date" max={filters.ate||undefined} value={filters.de} onChange={e=>setFilters({...filters,de:e.target.value})}/></label>
        <label>Recebimento até<input type="date" min={filters.de||undefined} value={filters.ate} onChange={e=>setFilters({...filters,ate:e.target.value})}/></label>
      </div><div className="actions"><button disabled={loading}>Aplicar filtros</button><button type="button" className="secondary" disabled={loading} onClick={()=>{setFilters(initialFilters);setApplied({...initialFilters});}}>Limpar filtros</button></div>
    </form>
    {error && <p className="error" role="alert">{error}</p>}
    {!loading && !error && <><div className="metrics report-metrics">{Object.entries({total:'Obras cadastradas',pendentes:'Pendentes',em_andamento:'Em andamento',concluidas:'Concluídas'}).map(([key,label])=><div key={key}><span>{label}</span><b>{number(metrics[key])}</b></div>)}</div>
      {reports && summary && <section className="card"><h3>Produção no período</h3><p>Totais das obras selecionadas pela data de recebimento da demanda.</p><dl className="production">{Object.entries(quantities).map(([key,label])=><div key={key}><dt>{label}</dt><dd>{number(summary[key])}</dd></div>)}</dl></section>}</>}
    <section className="card" aria-busy={loading}><h3>{reports?'Relatório de obras':page==='overview'?'Obras recentes':'Obras cadastradas'}</h3><p>{manager?'Visualização de todas as empresas, conforme os filtros aplicados.':'Visualização restrita às obras da sua empresa.'}</p>
      {loading?<p role="status">Carregando obras…</p>:!error&&(rows.length?<div className="table-scroll"><table><thead><tr><th>ID/OBRA Linko</th><th>Identificação</th><th>Empresa</th><th>Categoria</th><th>Status</th><th>Recebimento</th><th>Início</th><th>Término</th><th>Materiais aplicados</th>{!reports&&<th>Ações</th>}</tr></thead><tbody>{rows.map(row=><tr key={row.id}><td className="work-id">{row.id_linko}</td><td>{row.identificacao}</td><td>{row.empresa_nome}</td><td>{categories[row.categoria]||row.categoria}</td><td><span className={'status '+row.status}>{statuses[row.status]||row.status}</span></td><td>{date(row.data_recebimento_demanda)}</td><td>{date(row.data_inicio)}</td><td>{date(row.data_fim)}</td><td><details><summary>{row.materiais_obrigatorios?'Obrigatório · ':''}{number(materialTotals(row.materiais).un)} un · {Number(materialTotals(row.materiais).m).toLocaleString('pt-BR',{maximumFractionDigits:3})} m</summary><MaterialSummary items={row.materiais} catalog={catalog}/></details></td>{!reports&&<td><div className="actions"><button className="secondary" disabled={busy||catalogLoading||Boolean(catalogError)} aria-label={'Editar '+row.id_linko} onClick={()=>{setEditor(row);setDeleting(null);setSaveError('');}}>Editar</button>{manager&&<button className="danger" disabled={busy} aria-label={'Excluir '+row.id_linko} onClick={()=>{setDeleting(row);setEditor(null);setSaveError('');}}>Excluir</button>}</div></td>}</tr>)}</tbody></table></div>:<p>Nenhuma obra encontrada para os filtros selecionados.</p>)}
    </section>
  </>;
}
