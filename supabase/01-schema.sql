-- Linko Obras — schema inicial para Supabase/Postgres
create extension if not exists "pgcrypto";

create type public.usuario_tipo as enum ('gestor','empresa');
create type public.obra_categoria as enum ('rede_gpon','adequacao_predial','sites','instalacao_cliente','instalacao_b2b','backbone');
create type public.anexo_tipo as enum ('foto','as_built');

create table public.empresas (id uuid primary key default gen_random_uuid(), nome text not null, ativa boolean not null default true, criado_em timestamptz not null default now());
create table public.usuarios (id uuid primary key references auth.users(id) on delete cascade, tipo public.usuario_tipo not null, empresa_id uuid references public.empresas(id), login text unique not null, nome_equipe text, criado_em timestamptz not null default now(), constraint empresa_obrigatoria check ((tipo='empresa' and empresa_id is not null) or (tipo='gestor' and empresa_id is null)));
create table public.obras (id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id), categoria public.obra_categoria not null, identificacao text not null, data_recebimento_demanda date not null, data_inicio date, data_fim date, metragem_cabo numeric, capacidade_cabo text, fusoes integer, canalizacao_metragem numeric, caixas_subterraneas integer, caixas_emenda integer, adequacao_rede integer, criado_por uuid not null references public.usuarios(id), criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now());
create table public.obra_anexos (id uuid primary key default gen_random_uuid(), obra_id uuid not null references public.obras(id) on delete cascade, tipo public.anexo_tipo not null, arquivo_url text not null, descricao text, enviado_por uuid not null references public.usuarios(id), enviado_em timestamptz not null default now());

create or replace function public.usuario_atual() returns public.usuarios language sql stable security definer set search_path=public as $$ select * from public.usuarios where id=auth.uid() $$;
alter table public.empresas enable row level security; alter table public.usuarios enable row level security; alter table public.obras enable row level security; alter table public.obra_anexos enable row level security;
create policy "gestores gerenciam empresas" on public.empresas for all using ((select tipo from public.usuario_atual())='gestor') with check ((select tipo from public.usuario_atual())='gestor');
create policy "gestores gerenciam usuarios" on public.usuarios for all to authenticated using ((select tipo from public.usuario_atual())='gestor') with check ((select tipo from public.usuario_atual())='gestor');
create policy "usuario consulta proprio perfil" on public.usuarios for select to authenticated using (id=auth.uid());
create policy "isolamento de obras" on public.obras for select using ((select tipo from public.usuario_atual())='gestor' or empresa_id=(select empresa_id from public.usuario_atual()));
create policy "empresa cria a propria obra" on public.obras for insert with check ((select tipo from public.usuario_atual())='gestor' or empresa_id=(select empresa_id from public.usuario_atual()));
create policy "gestor ou propria empresa atualiza" on public.obras for update using ((select tipo from public.usuario_atual())='gestor' or empresa_id=(select empresa_id from public.usuario_atual())) with check ((select tipo from public.usuario_atual())='gestor' or empresa_id=(select empresa_id from public.usuario_atual()));
create policy "gestor exclui obra" on public.obras for delete to authenticated using ((select tipo from public.usuario_atual())='gestor');
create policy "anexos seguem a obra" on public.obra_anexos for select using (exists(select 1 from public.obras o where o.id=obra_id));
create policy "anexos por gestor ou empresa" on public.obra_anexos for all using (exists(select 1 from public.obras o where o.id=obra_id)) with check (exists(select 1 from public.obras o where o.id=obra_id));

create or replace view public.obras_com_status with (security_invoker = true) as select o.*, e.nome empresa_nome, case when o.data_fim is not null then 'concluida' when o.data_inicio is not null then 'em_andamento' else 'pendente' end status from public.obras o join public.empresas e on e.id=o.empresa_id;
