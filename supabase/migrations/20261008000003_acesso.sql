-- ON-STYLE: regras de acesso por linha (RLS) e privilégios (docs/02-arquitetura.md, "Perfis").
-- Tudo nasce fechado. Quem pode ler e escrever o quê está listado aqui e nos testes.
-- Agendamentos, vendas e alertas só mudam pelas funções da migração 2, que validam as regras.

alter table public.perfis enable row level security;
alter table public.empresa enable row level security;
alter table public.funcionamento enable row level security;
alter table public.bloqueios enable row level security;
alter table public.categorias enable row level security;
alter table public.servicos enable row level security;
alter table public.produtos enable row level security;
alter table public.agendamentos enable row level security;
alter table public.agendamento_eventos enable row level security;
alter table public.vendas enable row level security;
alter table public.venda_itens enable row level security;
alter table public.alertas enable row level security;
alter table public.emails_fila enable row level security;

-- Perfis: cada pessoa vê e edita o próprio; o dono vê todos. O papel não se edita (ver privilégios).
create policy perfis_ver on public.perfis for select to authenticated
  using (id = (select auth.uid()) or public.eh_dono());
create policy perfis_editar_o_proprio on public.perfis for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Dados públicos da barbearia: qualquer visitante lê; só o dono altera.
create policy empresa_ver on public.empresa for select to anon, authenticated using (true);
create policy empresa_editar on public.empresa for update to authenticated
  using (public.eh_dono()) with check (public.eh_dono());

create policy funcionamento_ver on public.funcionamento for select to anon, authenticated using (true);
create policy funcionamento_editar on public.funcionamento for all to authenticated
  using (public.eh_dono()) with check (public.eh_dono());

create policy categorias_ver on public.categorias for select to anon, authenticated using (true);
create policy categorias_editar on public.categorias for all to authenticated
  using (public.eh_dono()) with check (public.eh_dono());

-- Serviço e produto inativos somem do site, mas o dono continua vendo.
create policy servicos_ver on public.servicos for select to anon, authenticated
  using (ativo or public.eh_dono());
create policy servicos_editar on public.servicos for all to authenticated
  using (public.eh_dono()) with check (public.eh_dono());

create policy produtos_ver on public.produtos for select to anon, authenticated
  using (ativo or public.eh_dono());
create policy produtos_editar on public.produtos for all to authenticated
  using (public.eh_dono()) with check (public.eh_dono());

create policy bloqueios_dono on public.bloqueios for all to authenticated
  using (public.eh_dono()) with check (public.eh_dono());

-- Agendamentos: o cliente vê os seus, o dono vê todos. Escrita só pelas funções.
create policy agendamentos_ver on public.agendamentos for select to authenticated
  using (cliente_id = (select auth.uid()) or public.eh_dono());

create policy agendamento_eventos_ver on public.agendamento_eventos for select to authenticated
  using (
    public.eh_dono()
    or exists (
      select 1 from public.agendamentos a
      where a.id = agendamento_id and a.cliente_id = (select auth.uid())
    )
  );

create policy vendas_ver on public.vendas for select to authenticated using (public.eh_dono());
create policy venda_itens_ver on public.venda_itens for select to authenticated using (public.eh_dono());
create policy alertas_ver on public.alertas for select to authenticated using (public.eh_dono());
create policy alertas_marcar_lido on public.alertas for update to authenticated
  using (public.eh_dono()) with check (public.eh_dono());
create policy emails_fila_ver on public.emails_fila for select to authenticated using (public.eh_dono());

-- Privilégios ------------------------------------------------------------------------------
-- No Supabase, tabelas e funções novas chegam abertas para anon e authenticated. Fechamos tudo e
-- abrimos só o necessário; a RLS acima decide as linhas.

revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant select on public.empresa, public.funcionamento, public.categorias, public.servicos, public.produtos
  to anon, authenticated;
grant select on public.perfis, public.agendamentos, public.agendamento_eventos, public.bloqueios,
  public.vendas, public.venda_itens, public.alertas, public.emails_fila
  to authenticated;

-- O dono edita o catálogo e as regras (a RLS garante que só ele).
grant insert, update, delete on public.funcionamento, public.categorias, public.servicos,
  public.produtos, public.bloqueios to authenticated;
grant update on public.empresa to authenticated;

-- Escada de privilégio: cada pessoa só edita nome, celular e preferência de e-mail. O papel
-- (cliente ou dono) só muda direto no banco.
grant update (nome, celular, lembretes_por_email) on public.perfis to authenticated;
grant update (lido_em) on public.alertas to authenticated;

grant execute on function public.eh_dono() to anon, authenticated;
grant execute on function public.horarios_ocupados(date) to anon, authenticated;
grant execute on function public.reservar(uuid, timestamptz, text) to authenticated;
grant execute on function public.cancelar_agendamento(uuid) to authenticated;
grant execute on function public.mudar_situacao(uuid, text) to authenticated;
grant execute on function public.remarcar(uuid, timestamptz) to authenticated;
grant execute on function public.registrar_venda(jsonb, text, integer, timestamptz) to authenticated;
grant execute on function public.estornar_venda(uuid) to authenticated;
grant execute on function public.excluir_minha_conta() to authenticated;

-- Tempo real: o sino do dono recebe os alertas novos (a RLS vale também aqui).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.alertas;
  end if;
end $$;
