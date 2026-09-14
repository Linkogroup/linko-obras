-- Executar no SQL Editor como administrador, depois do cadastro dos usuários.
-- Não redefine senhas. Pode ser reexecutado sem reabrir trocas concluídas.
begin;

create schema if not exists linko_private;
revoke all on schema linko_private from public, anon, authenticated;
create table if not exists linko_private.senhas (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  pendente boolean not null default true,
  alterada_em timestamptz
);
alter table linko_private.senhas enable row level security;
revoke all on linko_private.senhas from public, anon, authenticated;

insert into linko_private.senhas (usuario_id, pendente)
select id, tipo = 'empresa' from public.usuarios
on conflict (usuario_id) do nothing;

create or replace function linko_private.preparar_primeiro_acesso()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    insert into linko_private.senhas (usuario_id, pendente)
    values (new.id, new.tipo = 'empresa') on conflict (usuario_id) do nothing;
  elsif new.tipo is distinct from old.tipo then
    insert into linko_private.senhas (usuario_id, pendente)
    values (new.id, new.tipo = 'empresa')
    on conflict (usuario_id) do update
    set pendente = excluded.pendente, alterada_em = null;
  end if;
  return new;
end; $$;
revoke all on function linko_private.preparar_primeiro_acesso() from public, anon, authenticated;
drop trigger if exists linko_preparar_primeiro_acesso on public.usuarios;
create trigger linko_preparar_primeiro_acesso
after insert or update of tipo on public.usuarios
for each row execute function linko_private.preparar_primeiro_acesso();

-- Só uma mudança efetiva da senha no Supabase Auth libera o acesso.
-- Alterar user_metadata ou chamar uma API do app não remove a exigência.
create or replace function linko_private.registrar_troca_senha()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password
     and coalesce(new.encrypted_password, '') <> '' then
    update linko_private.senhas
    set pendente = false, alterada_em = now()
    where usuario_id = new.id and pendente;
  end if;
  return new;
end; $$;
revoke all on function linko_private.registrar_troca_senha() from public, anon, authenticated;
drop trigger if exists linko_registrar_troca_senha on auth.users;
create trigger linko_registrar_troca_senha
after update of encrypted_password on auth.users
for each row execute function linko_private.registrar_troca_senha();

create or replace function public.linko_troca_pendente()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select pendente from linko_private.senhas
    where usuario_id = auth.uid()), true);
$$;
create or replace function public.linko_acesso_liberado()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.usuarios u
    join linko_private.senhas s on s.usuario_id = u.id
    left join public.empresas e on e.id = u.empresa_id
    where u.id = auth.uid() and not s.pendente
      and (u.tipo = 'gestor' or (u.tipo = 'empresa' and e.ativa))
  );
$$;
revoke all on function public.linko_troca_pendente() from public, anon;
revoke all on function public.linko_acesso_liberado() from public, anon;
grant execute on function public.linko_troca_pendente() to authenticated;
grant execute on function public.linko_acesso_liberado() to authenticated;

-- Corrige a política original que autorizava a edição do próprio perfil.
drop policy if exists "gestores gerenciam usuarios" on public.usuarios;
create policy "gestores gerenciam usuarios" on public.usuarios for all to authenticated
using (public.linko_acesso_liberado() and (select tipo from public.usuario_atual()) = 'gestor')
with check (public.linko_acesso_liberado() and (select tipo from public.usuario_atual()) = 'gestor');
drop policy if exists "usuario consulta proprio perfil" on public.usuarios;
create policy "usuario consulta proprio perfil" on public.usuarios for select to authenticated
using (id = auth.uid());

drop policy if exists "empresa consulta proprio cadastro" on public.empresas;
create policy "empresa consulta proprio cadastro" on public.empresas for select to authenticated
using (id = (select empresa_id from public.usuario_atual()));

-- Políticas restritivas: somam o bloqueio de primeiro acesso às regras existentes.
drop policy if exists linko_bloqueio_primeiro_acesso on public.empresas;
create policy linko_bloqueio_primeiro_acesso on public.empresas as restrictive
for all to authenticated using (public.linko_acesso_liberado())
with check (public.linko_acesso_liberado());
drop policy if exists linko_bloqueio_primeiro_acesso on public.obras;
create policy linko_bloqueio_primeiro_acesso on public.obras as restrictive
for all to authenticated using (public.linko_acesso_liberado())
with check (public.linko_acesso_liberado());
drop policy if exists linko_bloqueio_primeiro_acesso on public.obra_anexos;
create policy linko_bloqueio_primeiro_acesso on public.obra_anexos as restrictive
for all to authenticated using (public.linko_acesso_liberado())
with check (public.linko_acesso_liberado());

drop policy if exists "gestor ou propria empresa exclui" on public.obras;
drop policy if exists "gestor exclui obra" on public.obras;
create policy "gestor exclui obra" on public.obras for delete to authenticated
using ((select tipo from public.usuario_atual()) = 'gestor');

create or replace function linko_private.validar_obra()
returns trigger language plpgsql security definer set search_path = '' as $$
declare perfil public.usuarios;
begin
  select * into perfil from public.usuarios where id = auth.uid();
  if auth.uid() is not null then
    if perfil.id is null or not public.linko_acesso_liberado() then
      raise exception 'Acesso operacional bloqueado.';
    end if;
    if perfil.tipo = 'empresa' then
      new.empresa_id := perfil.empresa_id;
    end if;
    if TG_OP = 'INSERT' then new.criado_por := auth.uid(); end if;
  end if;
  if TG_OP = 'UPDATE' then
    new.criado_por := old.criado_por;
    new.criado_em := old.criado_em;
  end if;
  new.atualizado_em := now();
  if trim(new.identificacao) = '' then raise exception 'Informe a identificação.'; end if;
  if new.data_fim is not null and (new.data_inicio is null or new.data_fim < new.data_inicio) then
    raise exception 'Informe início e término em ordem cronológica.';
  end if;
  if new.metragem_cabo < 0 or new.fusoes < 0 or new.canalizacao_metragem < 0
     or new.caixas_subterraneas < 0 or new.caixas_emenda < 0 or new.adequacao_rede < 0 then
    raise exception 'Quantidades não podem ser negativas.';
  end if;
  return new;
end; $$;
revoke all on function linko_private.validar_obra() from public, anon, authenticated;
drop trigger if exists linko_validar_obra on public.obras;
create trigger linko_validar_obra before insert or update on public.obras
for each row execute function linko_private.validar_obra();

alter view public.obras_com_status set (security_invoker = true);
revoke all on public.empresas, public.usuarios, public.obras, public.obra_anexos,
  public.obras_com_status from anon;
grant select, insert, update, delete on public.empresas, public.usuarios,
  public.obras, public.obra_anexos to authenticated;
grant select on public.obras_com_status to authenticated;

commit;

select u.login, u.tipo, s.pendente as troca_senha_obrigatoria
from public.usuarios u join linko_private.senhas s on s.usuario_id = u.id
order by u.tipo, u.login;
