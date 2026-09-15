import React from 'react';
import {materialTotals} from './material-totals.js';
const fmt=n=>n.toLocaleString('pt-BR',{maximumFractionDigits:3});

export function MaterialSummary({items=[],catalog=[]}) {
  const totals=materialTotals(items);
  const names=new Map(catalog.map(c=>[c.id,c.modelo]));
  if(!items.length) return <p>Nenhum material informado.</p>;
  return <div className="material-summary">
    <p role="status"><strong>Total: {fmt(totals.un)} un • {fmt(totals.m)} m</strong>{totals.incomplete>0 && <span> — {totals.incomplete} lançamento(s) incompleto(s); total parcial.</span>}</p>
    {totals.groups.length>0 && <div className="table-scroll"><table><thead><tr><th>Modelo</th><th>Total</th><th>Medida</th></tr></thead><tbody>{totals.groups.map(g=><tr key={g.material_id+g.unidade}><td>{names.get(g.material_id)||'Modelo indisponível'}</td><td>{fmt(g.quantidade)}</td><td>{g.unidade}</td></tr>)}</tbody></table></div>}
  </div>;
}
export function MaterialEditor({items,onChange,catalog,required,onRequiredChange,manager}) {
  const update=(i,key,value)=>onChange(items.map((r,j)=>i===j?{...r,[key]:value}:r));
  return <section aria-labelledby="materials-title">
    <h3 id="materials-title">Materiais aplicados</h3>
    {manager ? <div className="form-grid"><label>Preenchimento dos materiais<select value={required?'obrigatorio':'opcional'} onChange={e=>onRequiredChange(e.target.value==='obrigatorio')}><option value="opcional">Opcional</option><option value="obrigatorio">Obrigatório</option></select></label></div> : <p>Preenchimento: <strong>{required?'Obrigatório':'Opcional'}</strong></p>}
    <p>Selecione o modelo e informe a quantidade. Você pode adicionar o mesmo modelo várias vezes. Escolha a medida de cada lançamento.</p>
    {items.map((item,i)=><fieldset className="material-row" key={item.rowKey}>
      <legend>Material {i+1}</legend><div className="form-grid">
        <label>Modelo<select required value={item.material_id} onChange={e=>update(i,'material_id',e.target.value)}><option value="">Selecione o modelo</option>{catalog.map(c=><option key={c.id} value={c.id}>{c.modelo}</option>)}</select></label>
        <label>Medida<select required value={item.unidade} onChange={e=>update(i,'unidade',e.target.value)}><option value="">Selecione</option><option value="un">Unidade (un)</option><option value="m">Metragem (m)</option></select></label>
        <label>{item.unidade==='m'?'Metragem (m)':'Quantidade'}<input type="number" required min={item.unidade==='un'?'1':'0.001'} max="1000000000" step={item.unidade==='un'?'1':'0.001'} value={item.quantidade} onChange={e=>update(i,'quantidade',e.target.value)}/></label>
      </div><button type="button" className="secondary" onClick={()=>onChange(items.filter((_,j)=>j!==i))}>Remover material {i+1}</button>
    </fieldset>)}
    <button type="button" className="secondary" disabled={items.length>=500||!catalog.length} onClick={()=>onChange([...items,{rowKey:crypto.randomUUID(),material_id:'',unidade:'',quantidade:''}])}>Adicionar material</button>
    {required&&!items.length&&<p className="error">Adicione e preencha ao menos um material para salvar.</p>}
    <MaterialSummary items={items} catalog={catalog}/>
  </section>;
}
