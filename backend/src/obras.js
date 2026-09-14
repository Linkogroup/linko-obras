export const categories = ['rede_gpon','adequacao_predial','sites','instalacao_cliente','instalacao_b2b','backbone'];
const quantities = ['metragem_cabo','fusoes','canalizacao_metragem','caixas_subterraneas','caixas_emenda','adequacao_rede'];
const integers = quantities.filter(k => !['metragem_cabo','canalizacao_metragem'].includes(k));
const dates = ['data_recebimento_demanda','data_inicio','data_fim'];
const editable = ['identificacao','categoria',...dates,'capacidade_cabo',...quantities];
export function payload(body, manager, creating = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Dados da obra inválidos.');
  const allowed = [...editable, ...(manager ? ['empresa_id', ...(!creating ? ['id_linko'] : [])] : [])];
  if (Object.keys(body).some(k => !allowed.includes(k))) throw new Error('Existem campos que seu perfil não pode alterar.');
  const row = {};
  for (const [key,value] of Object.entries(body)) {
    if (quantities.includes(key)) {
      if (value === '' || value === null) { row[key] = null; continue; }
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (integers.includes(key) && (!Number.isInteger(value) || value > 2147483647))) throw new Error('Informe quantidades válidas e não negativas.');
    } else if (dates.includes(key)) {
      if (value === '' || value === null) {
        if (key === 'data_recebimento_demanda') throw new Error('Informe a data de recebimento.');
        row[key] = null; continue;
      }
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value) throw new Error('Informe uma data válida.');
    } else {
      if (value === null && key === 'capacidade_cabo') { row[key] = null; continue; }
      if (typeof value !== 'string' || !value.trim() || value.length > 500) throw new Error('Preencha os campos de texto obrigatórios.');
    }
    row[key] = typeof value === 'string' ? value.trim() : value;
  }
  if (row.categoria && !categories.includes(row.categoria)) throw new Error('Categoria inválida.');
  if (row.id_linko && !/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(row.id_linko)) throw new Error('ID Linko deve ter de 3 a 64 letras maiúsculas, números, hífens ou sublinhados.');
  if (creating && ['identificacao','categoria','data_recebimento_demanda',...(manager ? ['empresa_id'] : [])].some(k => !row[k])) throw new Error('Preencha identificação, categoria, recebimento e empresa.');
  if (!Object.keys(row).length) throw new Error('Nenhuma informação para salvar.');
  return row;
}

export function summarize(rows) {
  const result = {total:rows.length, pendentes:0, em_andamento:0, concluidas:0, metragem_cabo:0, fusoes:0, canalizacao_metragem:0, caixas_subterraneas:0, caixas_emenda:0, adequacao_rede:0};
  for (const row of rows) {
    result[row.data_fim ? 'concluidas' : row.data_inicio ? 'em_andamento' : 'pendentes']++;
    for (const key of quantities) result[key] += Number(row[key] || 0);
  }
  return result;
}
