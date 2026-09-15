// Run: PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node backend/test/materiais-db.test.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db=new PGlite();
await db.exec(`create role anon; create role authenticated;
create schema auth; create table auth.users(id uuid primary key, encrypted_password text);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
for(const name of ['01-schema','02-primeiro-acesso','03-obras-relatorios','04-materiais']) {
  let sql=await readFile(new URL('../../supabase/'+name+'.sql',import.meta.url),'utf8');
  // Embedded PostgreSQL supplies gen_random_uuid without the optional pgcrypto extension.
  sql=sql.replace('create extension if not exists "pgcrypto";','');
  await db.exec(sql);
}
await db.exec(await readFile(new URL('../../supabase/04-materiais.sql',import.meta.url),'utf8'));
assert.equal((await db.query('select count(*)::int n from public.materiais_catalogo')).rows[0].n,94);
const manager='00000000-0000-0000-0000-000000000001', a='00000000-0000-0000-0000-000000000002', b='00000000-0000-0000-0000-000000000003';
await db.exec(`insert into auth.users(id) values ('${manager}'),('${a}'),('${b}');
insert into empresas(id,nome) values ('${a}','Empresa A'),('${b}','Empresa B');
insert into usuarios(id,tipo,empresa_id,login) values ('${manager}','gestor',null,'gestor'),('${a}','empresa','${a}','a'),('${b}','empresa','${b}','b');
update linko_private.senhas set pendente=false;
set role authenticated;`);
const login=id=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
const materials=[{material_id:'0056-0003-0',unidade:'un',quantidade:2},{material_id:'0056-0003-0',unidade:'un',quantidade:3},{material_id:'0056-0003-0',unidade:'m',quantidade:0.3}];
await login(manager);
for(const company of [a,b]) await db.query(`insert into obras(empresa_id,categoria,identificacao,data_recebimento_demanda,criado_por,materiais,materiais_obrigatorios)
values ($1,'rede_gpon','Teste','2026-09-15',$2,$3,true)`,[company,manager,JSON.stringify(materials)]);
await login(a);
let rows=(await db.query('select * from obras_com_status')).rows;
assert.equal(rows.length,1);assert.deepEqual(rows[0].materiais,materials);
assert.equal((await db.query('select count(*)::int n from materiais_catalogo')).rows[0].n,94);
const id=rows[0].id;
await assert.rejects(db.query("update obras set materiais='[]' where id=$1",[id]),/obrigatório/);
await assert.rejects(db.query("update obras set materiais_obrigatorios=false where id=$1",[id]),/gestores/);
for(const bad of [
 [{...materials[0],material_id:'inexistente'}],
 [{...materials[0],quantidade:0}],
 [{...materials[0],quantidade:1.5}],
 [{...materials[0],unidade:'m',quantidade:0.0001}],
 [{...materials[0],quantidade:null}],
 [{...materials[0],extra:true}],
 [{...materials[0],unidade:null}],
 {}]) await assert.rejects(db.query('update obras set materiais=$1 where id=$2',[JSON.stringify(bad),id]));
assert.equal((await db.query('update obras set materiais=$1 where empresa_id=$2 returning id',[JSON.stringify(materials),b])).rows.length,0);
await db.query('update obras set materiais=$1 where id=$2',[JSON.stringify([...materials,materials[0]]),id]);
await login(manager);
assert.equal((await db.query('select * from obras_com_status')).rows.length,2);
await db.query('update obras set materiais_obrigatorios=false,materiais=\'[]\' where id=$1',[id]);
await login(a);
await db.exec('reset role; update linko_private.senhas set pendente=true; set role authenticated;');
assert.equal((await db.query('select * from obras_com_status')).rows.length,0);
assert.equal((await db.query('select * from materiais_catalogo')).rows.length,0);
console.log('PASS: migration twice, 94 models, persistence, repeats, RLS isolation, mandatory flag, direct API invalid payloads, first-access gate.');
await db.close();
