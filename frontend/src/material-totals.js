export function materialTotals(items = []) {
  const groups=new Map();
  const totals={un:0,m:0,groups:[],incomplete:0};
  for(const item of items) {
    const n=Number(item.quantidade);
    if(!item.material_id || !['un','m'].includes(item.unidade) || item.quantidade==='' || !Number.isFinite(n) || n<=0 || n>1e9 ||
      Math.abs(n*1000-Math.round(n*1000))>0.0001 || (item.unidade==='un'&&!Number.isInteger(n))) {totals.incomplete++;continue;}
    const scaled=Math.round(n*1000);
    totals[item.unidade]+=scaled;
    const key=JSON.stringify([item.material_id,item.unidade]);
    const group=groups.get(key)||{material_id:item.material_id,unidade:item.unidade,quantidade:0};
    group.quantidade+=scaled;
    groups.set(key,group);
  }
  totals.un/=1000; totals.m/=1000;
  totals.groups=[...groups.values()].map(g=>({...g,quantidade:g.quantidade/1000}));
  return totals;
}
