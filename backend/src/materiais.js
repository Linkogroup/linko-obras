export function validateMaterials(value) {
  if (!Array.isArray(value) || value.length > 500) throw new Error('Informe até 500 lançamentos de materiais.');
  return value.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item) ||
        Object.keys(item).length !== 3 || !Object.keys(item).every(k=>['material_id','unidade','quantidade'].includes(k)) ||
        typeof item.material_id !== 'string' || !item.material_id.trim() || item.material_id.length > 100 ||
        !['un','m'].includes(item.unidade)) throw new Error('Selecione modelo e unidade para cada material.');
    const n=item.quantidade;
    if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0 || n > 1e9 ||
        Math.abs(n*1000-Math.round(n*1000)) > 0.0001 || (item.unidade === 'un' && !Number.isInteger(n)))
      throw new Error('Informe quantidade positiva: unidades inteiras ou metros com até 3 casas decimais.');
    return {material_id:item.material_id,unidade:item.unidade,quantidade:n};
  });
}
