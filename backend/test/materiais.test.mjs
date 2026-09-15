import test from 'node:test';
import assert from 'node:assert/strict';
import {payload,categories} from '../src/obras.js';
import {validateMaterials} from '../src/materiais.js';
import {materialTotals} from '../../frontend/src/material-totals.js';
import {csvContent} from '../../frontend/src/reports.js';
const line=(quantidade,unidade='un')=>({material_id:'0056-0003-0',unidade,quantidade});
test('repeated models remain separate and quantities are summed by model and unit',()=>{
  const lines=[line(2),line(3),line(0.1,'m'),line(0.2,'m')];
  assert.equal(validateMaterials(lines).length,4);
  const total=materialTotals(lines);
  assert.equal(total.un,5);assert.equal(total.m,0.3);assert.equal(total.groups.length,2);
});
test('blank, fractional units, excessive precision and invalid numeric values rejected',()=>{
  for(const n of ['',null,0,-1,NaN,Infinity,'2',1.5,1000000001]) assert.throws(()=>validateMaterials([line(n)]));
  assert.throws(()=>validateMaterials([line(0.0001,'m')]));
  assert.throws(()=>validateMaterials([{...line(1),extra:true}]));
  assert.throws(()=>validateMaterials([line(1,'kg')]));
  assert.equal(materialTotals([line('')]).incomplete,1);
});
test('all six categories accept materials; company cannot disable requirement',()=>{
  for(const categoria of categories) assert.equal(payload({categoria,materiais:[line(1)]},false).materiais.length,1);
  assert.throws(()=>payload({materiais_obrigatorios:false},false));
  assert.throws(()=>payload({materiais_obrigatorios:true,materiais:[]},true));
  assert.deepEqual(payload({materiais:[]},false).materiais,[]);
});
test('CSV contains descriptions and separate totals, never catalog IDs',()=>{
  const csv=csvContent([{materiais:[line(2),line(3)],materiais_obrigatorios:true}],{},{},[{id:'0056-0003-0',modelo:'ALÇA'}]);
  assert.ok(csv.includes('ALÇA: 5 un'));assert.ok(!csv.includes('0056-0003-0'));
});
