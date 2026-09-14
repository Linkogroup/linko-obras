export function csvContent(rows,categories={},statuses={}) {
  const columns={id_linko:'ID/OBRA Linko',identificacao:'Identificação',empresa_nome:'Empresa',categoria:'Categoria',status:'Status',data_recebimento_demanda:'Recebimento',data_inicio:'Início',data_fim:'Término',metragem_cabo:'Cabo (m)',capacidade_cabo:'Capacidade do cabo',fusoes:'Fusões',canalizacao_metragem:'Canalização (m)',caixas_subterraneas:'Caixas subterrâneas',caixas_emenda:'Caixas de emenda',adequacao_rede:'Adequações de rede'};
  const cell=value=>{
    let text=String(value??'');
    if(/^[\s]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text)) text="'"+text;
    return '"'+text.replaceAll('"','""')+'"';
  };
  return '\uFEFF'+[Object.values(columns).map(cell).join(';'),...rows.map(row=>Object.keys(columns).map(key=>cell(key==='categoria'?(categories[row[key]]||row[key]):key==='status'?(statuses[row[key]]||row[key]):row[key])).join(';'))].join('\r\n');
}
export function exportCsv(rows,categories,statuses) {
  const url=URL.createObjectURL(new Blob([csvContent(rows,categories,statuses)],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a'); a.href=url; a.download='relatorio-obras-'+new Date().toISOString().slice(0,10)+'.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
