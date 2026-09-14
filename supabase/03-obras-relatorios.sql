-- Executar após 01-schema.sql e 02-primeiro-acesso.sql, antes de publicar a API.
begin;
create sequence if not exists linko_private.obra_numero;
alter table public.obras add column if not exists id_linko text;
create or replace function linko_private.novo_id_obra()
returns text language plpgsql security definer set search_path = '' as $$
declare numero text; codigo text;
begin
  loop
    numero := nextval('linko_private.obra_numero'::regclass)::text;
    codigo := 'LINKO-' || lpad(numero, greatest(6, length(numero)), '0');
    exit when not exists(select 1 from public.obras where id_linko = codigo);
  end loop;
  return codigo;
end; $$;
revoke all on function linko_private.novo_id_obra() from public, anon, authenticated;
revoke all on sequence linko_private.obra_numero from public, anon, authenticated;
update public.obras set id_linko = linko_private.novo_id_obra() where id_linko is null;
alter table public.obras alter column id_linko set not null;
create unique index if not exists obras_id_linko_unique on public.obras(id_linko);
create or replace function linko_private.proteger_id_obra()
returns trigger language plpgsql security definer set search_path = '' as $$
declare perfil public.usuarios;
begin
  select * into perfil from public.usuarios where id = auth.uid();
  if TG_OP = 'INSERT' then
    new.id_linko := linko_private.novo_id_obra();
  else
    if new.id is distinct from old.id then
      raise exception 'A chave interna da obra não pode ser alterada.' using errcode = '42501';
    end if;
    if auth.uid() is not null and perfil.tipo is distinct from 'gestor'::public.usuario_tipo
       and (new.id_linko is distinct from old.id_linko or new.empresa_id is distinct from old.empresa_id) then
      raise exception 'A empresa não pode alterar o ID Linko ou o vínculo da obra.' using errcode = '42501';
    end if;
  end if;
  if new.id_linko is null or new.id_linko !~ '^[A-Z0-9][A-Z0-9_-]{2,63}$' then
    raise exception 'ID Linko inválido.';
  end if;
  if new.data_inicio < new.data_recebimento_demanda then
    raise exception 'O início não pode anteceder o recebimento da demanda.';
  end if;
  return new;
end; $$;
revoke all on function linko_private.proteger_id_obra() from public, anon, authenticated;
-- Roda antes de linko_validar_obra, que preenche os campos de autoria.
drop trigger if exists linko_00_proteger_id_obra on public.obras;
create trigger linko_00_proteger_id_obra before insert or update on public.obras
for each row execute function linko_private.proteger_id_obra();
-- Acrescenta a coluna ao fim para preservar a view existente.
create or replace view public.obras_com_status with (security_invoker = true) as
select o.id, o.empresa_id, o.categoria, o.identificacao, o.data_recebimento_demanda,
  o.data_inicio, o.data_fim, o.metragem_cabo, o.capacidade_cabo, o.fusoes,
  o.canalizacao_metragem, o.caixas_subterraneas, o.caixas_emenda, o.adequacao_rede,
  o.criado_por, o.criado_em, o.atualizado_em, e.nome empresa_nome,
  case when o.data_fim is not null then 'concluida'
       when o.data_inicio is not null then 'em_andamento' else 'pendente' end status,
  o.id_linko
from public.obras o join public.empresas e on e.id = o.empresa_id;
grant select on public.obras_com_status to authenticated;
revoke all on public.obras_com_status from anon;
commit;
