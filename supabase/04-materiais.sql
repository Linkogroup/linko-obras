-- Execute após 03-obras-relatorios.sql. Preserva obras e regras de acesso.
begin;
create table if not exists public.materiais_catalogo (
  id text primary key,
  modelo text not null
);
alter table public.materiais_catalogo enable row level security;
revoke all on public.materiais_catalogo from public, anon, authenticated;
grant select on public.materiais_catalogo to authenticated;
drop policy if exists materiais_catalogo_leitura on public.materiais_catalogo;
create policy materiais_catalogo_leitura on public.materiais_catalogo
for select to authenticated using (public.linko_acesso_liberado());
-- Descrições da planilha Materiais implantação Vivo; unidade escolhida no lançamento.
insert into public.materiais_catalogo (id, modelo) values
('0056-0003-0', 'ALÇA PREFORM P/ DROP ÓPT ASU ATÉ 12 FO'),
('0192-0219-9', 'SPLITTER OPT. PASSIVO 1:8-10 DB-FTTH'),
('0219-0022-1', 'KIT DERIVAÇÃO FIST-GCO DERIVAÇÃO RAYCHEM'),
('0223-0010-4', 'CORDOALHA DE AÇO ALUMINIZADO 4,8 MM'),
('0252-0320-4', 'CABO CCI 50 X 02 PARES'),
('0256-0153-9', 'ALÇA PRÉ-FORMADA APF 6,4MM'),
('0256-0234-9', 'LAÇO PREFORM P/ DROP ÓPT ASU ATÉ 12 FO'),
('0256-0243-5', 'ALÇA PREF P/CFOA-SM-AS-80 de 18 a 36 fo-'),
('0256-0244-6', 'ALÇA PREF P/CFOA-SM-AS-80 de 48 a 72 fo-'),
('0256-0245-7', 'ALÇA PREF P/CFOA-SM-AS-80 de 144 fo-TS'),
('0256-0247-9', 'ALÇA PREF P/CFOA-SM-AS-200 de 18 a 36 fo'),
('0256-0248-0', 'ALÇA PREF P/CFOA-SM-AS-200 de 48 a 72 fo'),
('0380-9200-0', 'ALÇA PREF. P/ CORDOALHA DIELÉTRICA 6,4'),
('0380-9201-1', 'CORDOALHA DIELÉTRICA 6,4'),
('0380-9203-3', 'FIO DE ESPINAR DIELETRICO'),
('0380-9204-4', 'LAÇO PREF. P/ CORDOALHA DIELÉTRICA 6,4'),
('0386-0548-1', 'DGO 12 FO BEO-DIO 1 U E 19 SC - APC'),
('0386-0549-0', 'PIG TAIL FIBRA SM COMP 3M CONECTOR SC/PC'),
('0430-0002-9', 'SUBDUTO SINGELO RANHURADO 40MM DIAM EXT'),
('0452-0120-3', 'CABO OPTICO CFOA-SM AS 80 24F TS'),
('0452-0123-6', 'CABO OPTICO CFOA-SM AS 80 72F TS'),
('0452-0127-0', 'CABO OPTICO CFOA-SM AS 200 72F TS'),
('0460-0048-2', 'KIT DERIV TERMOC CEO AEREO/SUBT FOSC100'),
('0486-0063-0', 'DGO 19/23" 24FO,24 E2000-APC C/ STORG'),
('0486-0064-1', 'DGO GA 19/23" 12FO,12 E2000-APC C/STORG'),
('0486-0104-1', 'DGO GA 19" 144FO EUROCARD E2000-APC C/S'),
('0486-0358-5', 'CAIXA OPTICA 6 ADAPTADORES + PIGTAIL'),
('0456-0157-7', 'SUP ANCORAGEM CABO OPT AS E CORD DIELETR'),
('0456-0158-8', 'SUP PASSAGEM CABO OPT AS E CORD DIELETR'),
('0456-0160-0', 'LAÇO PREF P/CFOA-SM-AS-80 DE 18 A 36 FO'),
('0456-0161-1', 'LAÇO PREF P/CFOA-SM-AS-80 DE 48 A 72 FO'),
('0456-0162-2', 'LAÇO PREF P/CFOA-SM-AS-80 DE 144 FO'),
('0186-0086-6', 'DIST INT OPT ESPELHAMENTO SC/APC 144FO'),
('0380-9214-4', 'CTOPS 1:2 + 1:8 PRE-C SELADA - 85/15 FC'),
('0256-0343-3', 'CTOPS 1:8 PRECONECTORIZADA SELADA FC'),
('0380-9211-1', 'CTOPS 1:2 + 1:8 PRE-C SELADA - 60/40 FC'),
('0380-9212-2', 'CTOPS 1:2 + 1:8 PRE-C SELADA - 70/30 FC'),
('0256-0341-1', 'CHASSI E TAMPÃO RETANG. ARTICULADO R-2'),
('0186-0100-2', 'MINI CDOE 1:8 ENTRADA E SAÍDA PRECON'),
('0186-0099-8', 'MINI CDOE 1:2 + 1:8 PRECON SELADA 85/15'),
('0186-0099-9', 'MINI CDOE 1:2 + 1:8 PRECON SELADA 80/20'),
('0186-0100-0', 'MINI CDOE 1:2 + 1:8 PRECON SELADA 90/10'),
('0254-0084-4', 'CRUZETA P RESERVA TÉCNICA FO POSTE 550mm'),
('0186-0097-7', 'MINI CDOE 1:2 + 1:8 PRECON SELADA 60/40'),
('0186-0098-8', 'MINI CDOE 1:2 + 1:8 PRECON SELADA 70/30'),
('0460-0069-9', 'SUPORTE UNIVERSAL PARA CAIXA BARRAMENTO'),
('0380-9221-1', 'DROP OPTICO AS CM AR FIG8 LSZH - 4F'),
('0452-1257-7', 'CABO DROP CIRCULAR 5 MM 12 FIBRAS'),
('0456-0170-0', 'MINI-CEO TERMOC 16ENT AEREO E SUBT 144FO'),
('0456-0169-9', 'CONJ EMENDA OPT MEC AER SUBT - 48F 4ENT'),
('0456-0172-2', 'CONJ EMENDA OPT MEC AER SUBT - 72F 4ENT'),
('0380-9231-1', 'CTOPS 1:2 + 1:8 PRE-C SELADA 70/30  CPT'),
('0452-1258-8', 'CABO DROP CIRCULAR 12 FIBRAS - 100M'),
('0452-1264-4', 'CABO DROP CIRCULAR 12 FIBRAS - 500M'),
('0452-1259-9', 'CABO DROP CIRCULAR 12 FIBRAS - 150M'),
('0452-1262-2', 'CABO DROP CIRCULAR 12 FIBRAS - 300M'),
('0452-1263-3', 'CABO DROP CIRCULAR 12 FIBRAS - 400M'),
('0452-1297-7', 'CABO DROP CIRCULAR 48 FIBRAS - 300M'),
('0452-1290-0', 'CABO DROP CIRCULAR 36 FIBRAS - 250M'),
('0452-1299-9', 'CABO DROP CIRCULAR 72 FIBRAS - 300M'),
('0452-1295-5', 'CABO DROP CIRCULAR 48 FIBRAS - 200M'),
('0456-0184-4', 'CAIXA EMENDA PRECON SELADA 12 FIBRAS'),
('0452-1296-6', 'CABO DROP CIRCULAR 48 FIBRAS - 250M'),
('0460-0076-6', 'CDPS 4 SP1:8 CAIXA DERIV PRE-C SPLIT'),
('0486-0395-5', 'CAIXA TRANSIÇÃO PRE-CON 4FO'),
('0460-0078-8', 'CDPS 4 SP1:4 CAIXA DERIV PRE-C SPLIT'),
('0460-0079-9', 'CDPS 2 SP1:4 CAIXA DERIV PRE-C SPLIT'),
('0256-0352-2', 'CHASSI E TAMPÃO CIRC. ARTICULADO RR90'),
('0460-0084-4', 'CONJ. SUP. CABOS OPT MEIO DE VAO RAQUETE'),
('0380-9263-3', 'DROP OPT PREC 2PTAS FIG8 UNIV 100M PRET'),
('0380-9264-4', 'DROP OPT PREC 2PTAS FIG8 UNIV 150M PRET'),
('0380-9266-6', 'DROP OPT PREC 2PTAS FIG8 UNIV 300M PRET'),
('0380-9267-7', 'DROP OPT PREC 2PTAS FIG8 UNIV 400M PRET'),
('0380-9259-9', 'ADAPTADOR REF UNIV P DROP COMPACTO FIG8'),
('0486-0405-0', 'DGO 144FO PARA REDE 1:32 SC-APC PRECONEC'),
('0380-9294-0', 'LAÇO PREF P/ CABO DROP ALT. CAP ATE  48'),
('0380-9295-0', 'ALÇA PREF P/ CABO DROP ALT. CAP ATE  48'),
('0380-9292-0', 'CONECT OPT FAC SC/APC FIG8 COMPAC REDEXT'),
('0380-9293-0', 'DROP OPT COMP INTERNO CFOI REDEXT'),
('0258-0397-0', 'PONTO TERMINAL DE REDE-ÓPTICO REDEXT'),
('0430-0017-7', 'DUTO P PROTEÇÃO PARA CABOS EM REDE AEREA'),
('0452-1331-0', 'CABO DROP ALTA CAPACID. 24 FIBRAS S/MPO'),
('0452-1332-0', 'CABO DROP ALTA CAPACID. 36 FIBRAS S/MPO'),
('0452-1373-0', 'CABO DROP ALTA CAPACID. 144 FIBRAS S/MPO'),
('0186-0175-8', 'DROP 02F SN LC-LC UPC (SMALL CELL) 600M'),
('0458-0014-0', 'Protetor Ref p/ Conec Campo CDOE (NOVA)'),
('0452-1333-0', 'CABO DROP ALTA CAPACID. 72 FIBRAS S/MPO'),
('0458-0015-0', 'Protetor p/ Conec Reforçado de Campo'),
('0256-0367-0', 'ALÇA PREF P/ CABO DROP ALT. CAP. 72FO'),
('0256-0368-0', 'ALÇA PREF P/ CABO DROP ALT. CAP 144FO'),
('0456-0206-0', 'LAÇO PREF P/ CABO DROP ALT. CAP 72FO'),
('0456-0207-0', 'LAÇO PREF P/ CABO DROP ALT. CAP 144FO'),
('0254-0091-0', 'POSTE CONCRETO DUPLO T 10,5/200'),
('0458-0013-0', 'Protetor Ref p/ Conec Campo CDOE (ATIVA)')
on conflict (id) do update set modelo = excluded.modelo;

alter table public.obras add column if not exists materiais jsonb not null default '[]'::jsonb;
alter table public.obras add column if not exists materiais_obrigatorios boolean not null default false;

create or replace function linko_private.validar_materiais_obra()
returns trigger language plpgsql security definer set search_path = '' as $$
declare item jsonb; qtd numeric; perfil public.usuarios;
begin
  select * into perfil from public.usuarios where id = auth.uid();
  if auth.uid() is not null and perfil.tipo is distinct from 'gestor'::public.usuario_tipo then
    if (TG_OP = 'INSERT' and new.materiais_obrigatorios)
       or (TG_OP = 'UPDATE' and new.materiais_obrigatorios is distinct from old.materiais_obrigatorios) then
      raise exception 'Somente gestores podem definir a obrigatoriedade dos materiais.' using errcode = '42501';
    end if;
  end if;
  if new.materiais is null or jsonb_typeof(new.materiais) is distinct from 'array' then
    raise exception 'Lista de materiais inválida.';
  end if;
  if jsonb_array_length(new.materiais) > 500 then raise exception 'Limite de 500 lançamentos por obra.'; end if;
  if new.materiais_obrigatorios and jsonb_array_length(new.materiais) = 0 then
    raise exception 'Informe ao menos um material: preenchimento obrigatório.';
  end if;
  for item in select value from jsonb_array_elements(new.materiais) loop
    if jsonb_typeof(item) is distinct from 'object' then raise exception 'Material inválido.'; end if;
    if not (item ?& array['material_id','unidade','quantidade'])
       or (item - array['material_id','unidade','quantidade']) <> '{}'::jsonb
       or jsonb_typeof(item->'material_id') is distinct from 'string'
       or jsonb_typeof(item->'unidade') is distinct from 'string'
       or (item->>'unidade') not in ('un','m')
       or jsonb_typeof(item->'quantidade') is distinct from 'number' then
      raise exception 'Informe modelo, unidade e quantidade em cada material.';
    end if;
    if not exists (select 1 from public.materiais_catalogo where id = item->>'material_id') then
      raise exception 'Selecione um modelo do catálogo.';
    end if;
    qtd := (item->>'quantidade')::numeric;
    if qtd <= 0 or qtd > 1000000000 or qtd <> round(qtd, 3)
       or (item->>'unidade' = 'un' and qtd <> trunc(qtd)) then
      raise exception 'Quantidade deve ser positiva; unidades inteiras e metros com até 3 casas decimais.';
    end if;
  end loop;
  return new;
end; $$;
revoke all on function linko_private.validar_materiais_obra() from public, anon, authenticated;
drop trigger if exists linko_validar_materiais_obra on public.obras;
create trigger linko_validar_materiais_obra before insert or update on public.obras
for each row execute function linko_private.validar_materiais_obra();
create or replace view public.obras_com_status with (security_invoker = true) as
select o.id, o.empresa_id, o.categoria, o.identificacao, o.data_recebimento_demanda,
  o.data_inicio, o.data_fim, o.metragem_cabo, o.capacidade_cabo, o.fusoes,
  o.canalizacao_metragem, o.caixas_subterraneas, o.caixas_emenda, o.adequacao_rede,
  o.criado_por, o.criado_em, o.atualizado_em, e.nome empresa_nome,
  case when o.data_fim is not null then 'concluida'
       when o.data_inicio is not null then 'em_andamento' else 'pendente' end status,
  o.id_linko, o.materiais, o.materiais_obrigatorios
from public.obras o join public.empresas e on e.id = o.empresa_id;
grant select on public.obras_com_status to authenticated;
revoke all on public.obras_com_status from anon;
commit;
