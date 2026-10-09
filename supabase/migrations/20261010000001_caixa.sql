-- ON-STYLE, Fase 6: forma de pagamento, atendimento avulso, caixa e estorno com registro
-- (docs/02-arquitetura.md, regras F3, F4 e F5).
-- Concluir um atendimento e registrar uma venda passam a pedir a forma de pagamento. O caixa é
-- aberto com um valor inicial e fechado com o dinheiro contado; o banco calcula o que deveria
-- haver na gaveta e guarda a diferença. Tudo continua escrevendo só por funções.
-- Cada pagamento e cada estorno guardam em qual caixa entraram (o que estava aberto naquela hora),
-- então o fechamento soma exatamente os lançamentos do caixa, sem depender de janelas de horário.

create table public.caixas (
  id uuid primary key default gen_random_uuid(),
  aberto_em timestamptz not null default now(),
  aberto_por uuid references public.perfis (id) on delete set null,
  valor_inicial_centavos integer not null check (valor_inicial_centavos >= 0),
  fechado_em timestamptz,
  fechado_por uuid references public.perfis (id) on delete set null,
  valor_contado_centavos integer check (valor_contado_centavos >= 0),
  esperado_centavos integer,
  diferenca_centavos integer,
  resumo jsonb,
  observacao text not null default '',
  check (fechado_em is null or (valor_contado_centavos is not null and esperado_centavos is not null))
);
-- Um caixa aberto por vez.
create unique index caixas_um_aberto on public.caixas ((true)) where fechado_em is null;
alter table public.caixas enable row level security;
create policy caixas_ver on public.caixas for select to authenticated using (public.eh_dono());
revoke all on public.caixas from public, anon, authenticated;
grant select on public.caixas to authenticated;

-- Agendamentos: como foi pago, quando entrou o dinheiro, em que caixa e se foi atendimento sem
-- hora marcada (avulso).
alter table public.agendamentos
  add column forma_pagamento text check (forma_pagamento in ('pix', 'dinheiro', 'debito', 'credito')),
  add column pago_em timestamptz,
  add column caixa_id uuid references public.caixas (id) on delete restrict,
  add column avulso boolean not null default false,
  add constraint agendamentos_avulso_concluido check (
    not avulso or (situacao = 'concluido' and cliente_id is null and forma_pagamento is not null)
  );
create index agendamentos_caixa on public.agendamentos (caixa_id) where caixa_id is not null;

-- O atendimento avulso já aconteceu: não ocupa a agenda de ninguém.
alter table public.agendamentos drop constraint agendamentos_sem_sobreposicao;
alter table public.agendamentos add constraint agendamentos_sem_sobreposicao
  exclude using gist (tstzrange(inicio, fim, '[)') with &&)
  where (situacao not in ('cancelado', 'nao_compareceu') and not avulso);

-- Vendas: em que caixa entrou, e no estorno quem estornou, quando, por quê e em que caixa saiu.
alter table public.vendas
  add column caixa_id uuid references public.caixas (id) on delete restrict,
  add column estornada_por uuid references public.perfis (id) on delete set null,
  add column estorno_motivo text not null default '',
  add column estorno_caixa_id uuid references public.caixas (id) on delete restrict;
create index vendas_caixa on public.vendas (caixa_id) where caixa_id is not null;
create index vendas_estorno_caixa on public.vendas (estorno_caixa_id) where estorno_caixa_id is not null;

-- O caixa aberto agora, travado contra fechamento enquanto o pagamento é gravado. Se o caixa
-- fechar no meio, o pagamento espera, vê que não há mais caixa aberto e entra sem caixa.
create function public.caixa_aberto_travado() returns uuid
language sql security definer set search_path = '' as $$
  select id from public.caixas where fechado_em is null for share
$$;
revoke all on function public.caixa_aberto_travado() from public, anon, authenticated;

-- Concluir pede a forma de pagamento; o dinheiro "entra" na hora da conclusão.
drop function public.mudar_situacao(uuid, text);
create function public.mudar_situacao(p_id uuid, p_para text, p_forma_pagamento text default null)
returns public.agendamentos
language plpgsql security definer set search_path = '' as $$
declare
  v_a public.agendamentos;
begin
  if not public.eh_dono() then
    raise exception 'sem_permissao';
  end if;
  select * into v_a from public.agendamentos where id = p_id for update;
  if not found then
    raise exception 'agendamento_inexistente';
  end if;
  if not public.transicao_permitida(v_a.situacao, p_para) then
    raise exception 'transicao_invalida';
  end if;
  if p_para = 'nao_compareceu' and v_a.inicio > now() then
    raise exception 'ainda_nao_comecou';
  end if;
  if p_para = 'concluido' then
    if p_forma_pagamento is null then
      raise exception 'forma_pagamento_obrigatoria';
    end if;
    update public.agendamentos
      set situacao = p_para, forma_pagamento = p_forma_pagamento, pago_em = now(),
          caixa_id = public.caixa_aberto_travado()
      where id = p_id returning * into v_a;
  else
    update public.agendamentos set situacao = p_para where id = p_id returning * into v_a;
  end if;
  return v_a;
end $$;

-- Cliente sem hora marcada: o dono registra o serviço já feito. Entra como concluído, sem conta de
-- cliente, sem aviso no sino e sem ocupar a agenda.
create function public.registrar_atendimento_avulso(
  p_servico_id uuid,
  p_forma_pagamento text,
  p_cliente_nome text default ''
) returns public.agendamentos
language plpgsql security definer set search_path = '' as $$
declare
  v_servico public.servicos;
  v_novo public.agendamentos;
begin
  if not public.eh_dono() then
    raise exception 'sem_permissao';
  end if;
  if p_forma_pagamento is null then
    raise exception 'forma_pagamento_obrigatoria';
  end if;
  select * into v_servico from public.servicos where id = p_servico_id and ativo;
  if not found then
    raise exception 'servico_indisponivel';
  end if;
  insert into public.agendamentos (
    cliente_nome, cliente_celular, servico_id, servico_nome, preco_centavos, duracao_minutos,
    inicio, fim, situacao, forma_pagamento, pago_em, caixa_id, avulso
  ) values (
    coalesce(nullif(trim(p_cliente_nome), ''), 'Cliente avulso'), '', v_servico.id, v_servico.nome,
    v_servico.preco_centavos, v_servico.duracao_minutos,
    now() - make_interval(mins => v_servico.duracao_minutos), now(),
    'concluido', p_forma_pagamento, now(), public.caixa_aberto_travado(), true
  ) returning * into v_novo;
  return v_novo;
end $$;

-- O avulso não é um horário marcado: sem aviso no sino e fora dos períodos ocupados.
create or replace function public.ao_mudar_agendamento() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_fuso text;
  v_quando text;
begin
  select fuso into v_fuso from public.empresa where id = 1;
  v_quando := to_char(new.inicio at time zone v_fuso, 'DD/MM "às" HH24:MI');
  if tg_op = 'INSERT' then
    insert into public.agendamento_eventos (agendamento_id, de, para, por)
    values (new.id, null, new.situacao, (select auth.uid()));
    if not new.avulso then
      insert into public.alertas (tipo, texto, agendamento_id) values (
        'novo_agendamento',
        new.cliente_nome || ' agendou ' || new.servico_nome || ' para ' || v_quando || '.',
        new.id
      );
    end if;
  elsif new.situacao <> old.situacao then
    insert into public.agendamento_eventos (agendamento_id, de, para, por)
    values (new.id, old.situacao, new.situacao, (select auth.uid()));
    -- O dono sabe o que ele mesmo cancelou; o aviso é para o cancelamento feito pelo cliente.
    if new.situacao = 'cancelado' and new.cliente_id is not null and new.cliente_id = (select auth.uid()) then
      insert into public.alertas (tipo, texto, agendamento_id) values (
        'cancelamento',
        new.cliente_nome || ' cancelou ' || new.servico_nome || ' de ' || v_quando || '.',
        new.id
      );
    end if;
  end if;
  return null;
end $$;

create or replace function public.horarios_ocupados(p_dia date) returns table (inicio timestamptz, fim timestamptz)
language sql stable security definer set search_path = '' as $$
  with dia as (
    select
      p_dia::timestamp at time zone e.fuso as de,
      (p_dia + 1)::timestamp at time zone e.fuso as ate
    from public.empresa e where e.id = 1
  )
  select a.inicio, a.fim
  from public.agendamentos a, dia
  where a.situacao not in ('cancelado', 'nao_compareceu') and not a.avulso
    and a.inicio < dia.ate and a.fim > dia.de
  union all
  select b.inicio, b.fim
  from public.bloqueios b, dia
  where b.inicio < dia.ate and b.fim > dia.de
  order by 1
$$;

-- Venda: a forma de pagamento passa a ser obrigatória, e a venda entra no caixa aberto.
create or replace function public.registrar_venda(
  p_itens jsonb,
  p_forma_pagamento text default null,
  p_desconto_centavos integer default 0,
  p_ocorrida_em timestamptz default now()
) returns public.vendas
language plpgsql security definer set search_path = '' as $$
declare
  v_venda public.vendas;
  v_item record;
  v_produto public.produtos;
  v_bruto integer := 0;
begin
  if not public.eh_dono() then
    raise exception 'sem_permissao';
  end if;
  if jsonb_typeof(p_itens) is distinct from 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'venda_vazia';
  end if;
  if p_forma_pagamento is null then
    raise exception 'forma_pagamento_obrigatoria';
  end if;
  insert into public.vendas (total_centavos, forma_pagamento, ocorrida_em, criado_por, caixa_id)
  values (0, p_forma_pagamento, p_ocorrida_em, (select auth.uid()), public.caixa_aberto_travado())
  returning * into v_venda;

  for v_item in
    select (i ->> 'produto_id')::uuid as produto_id, (i ->> 'quantidade')::integer as quantidade
    from jsonb_array_elements(p_itens) i
  loop
    if v_item.quantidade is null or v_item.quantidade < 1 then
      raise exception 'quantidade_invalida';
    end if;
    select * into v_produto from public.produtos where id = v_item.produto_id and ativo;
    if not found then
      raise exception 'produto_indisponivel';
    end if;
    insert into public.venda_itens (venda_id, produto_id, produto_nome, preco_centavos, quantidade)
    values (v_venda.id, v_produto.id, v_produto.nome, v_produto.preco_centavos, v_item.quantidade);
    v_bruto := v_bruto + v_produto.preco_centavos * v_item.quantidade;
  end loop;

  if p_desconto_centavos < 0 or p_desconto_centavos > v_bruto then
    raise exception 'desconto_invalido';
  end if;
  update public.vendas
    set total_centavos = v_bruto - p_desconto_centavos, desconto_centavos = p_desconto_centavos
    where id = v_venda.id returning * into v_venda;
  return v_venda;
end $$;

-- Estorno com registro: quem fez, quando, por quê e em que caixa saiu o dinheiro (F3).
drop function public.estornar_venda(uuid);
create function public.estornar_venda(p_id uuid, p_motivo text default '')
returns public.vendas
language plpgsql security definer set search_path = '' as $$
declare
  v_venda public.vendas;
begin
  if not public.eh_dono() then
    raise exception 'sem_permissao';
  end if;
  select * into v_venda from public.vendas where id = p_id for update;
  if not found then
    raise exception 'venda_inexistente';
  end if;
  if v_venda.estornada_em is not null then
    raise exception 'ja_estornada';
  end if;
  update public.vendas
    set estornada_em = now(),
        estornada_por = (select auth.uid()),
        estorno_motivo = left(trim(coalesce(p_motivo, '')), 300),
        estorno_caixa_id = public.caixa_aberto_travado()
    where id = p_id returning * into v_venda;
  return v_venda;
end $$;

-- Os lançamentos de um caixa: atendimentos pagos e vendas como entrada, estornos como saída
-- (valor negativo). Registros antigos, sem forma de pagamento, nunca entraram em caixa.
create function public.lancamentos_do_caixa(p_id uuid)
returns table (tipo text, origem_id uuid, forma_pagamento text, valor_centavos integer, em timestamptz)
language sql stable security definer set search_path = '' as $$
  select 'atendimento'::text, a.id, a.forma_pagamento, a.preco_centavos, a.pago_em
  from public.agendamentos a
  where public.eh_dono() and a.caixa_id = p_id
  union all
  select 'venda'::text, v.id, v.forma_pagamento, v.total_centavos, v.criado_em
  from public.vendas v
  where public.eh_dono() and v.caixa_id = p_id
  union all
  select 'estorno'::text, v.id, v.forma_pagamento, -v.total_centavos, v.estornada_em
  from public.vendas v
  where public.eh_dono() and v.estorno_caixa_id = p_id
$$;

-- Resumo de um caixa, aberto ou fechado: por forma de pagamento, e o dinheiro que deveria haver
-- na gaveta (troco inicial mais o dinheiro que entrou, menos o que foi estornado).
create function public.resumo_do_caixa(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_caixa public.caixas;
  v_por_forma jsonb;
  v_dinheiro integer;
begin
  if not public.eh_dono() then
    raise exception 'sem_permissao';
  end if;
  select * into v_caixa from public.caixas where id = p_id;
  if not found then
    raise exception 'caixa_inexistente';
  end if;

  select jsonb_object_agg(f.forma, jsonb_build_object(
    'entradas_centavos', coalesce(l.entradas, 0),
    'estornos_centavos', coalesce(l.estornos, 0),
    'quantidade', coalesce(l.quantidade, 0)
  ))
  into v_por_forma
  from (values ('pix'), ('dinheiro'), ('debito'), ('credito')) as f (forma)
  left join (
    select forma_pagamento,
      sum(valor_centavos) filter (where tipo <> 'estorno') as entradas,
      -sum(valor_centavos) filter (where tipo = 'estorno') as estornos,
      count(*) filter (where tipo <> 'estorno') as quantidade
    from public.lancamentos_do_caixa(p_id)
    group by forma_pagamento
  ) l on l.forma_pagamento = f.forma;

  v_dinheiro := v_caixa.valor_inicial_centavos
    + coalesce((v_por_forma -> 'dinheiro' ->> 'entradas_centavos')::integer, 0)
    - coalesce((v_por_forma -> 'dinheiro' ->> 'estornos_centavos')::integer, 0);

  return jsonb_build_object('por_forma', v_por_forma, 'esperado_centavos', v_dinheiro);
end $$;

create function public.abrir_caixa(p_valor_inicial_centavos integer default 0)
returns public.caixas
language plpgsql security definer set search_path = '' as $$
declare
  v_caixa public.caixas;
begin
  if not public.eh_dono() then
    raise exception 'sem_permissao';
  end if;
  if p_valor_inicial_centavos is null or p_valor_inicial_centavos < 0 then
    raise exception 'valor_invalido';
  end if;
  begin
    insert into public.caixas (aberto_por, valor_inicial_centavos)
    values ((select auth.uid()), p_valor_inicial_centavos)
    returning * into v_caixa;
  exception when unique_violation then
    raise exception 'caixa_ja_aberto';
  end;
  return v_caixa;
end $$;

-- Fecha o caixa aberto. O banco calcula o esperado, compara com o contado e guarda a diferença
-- (positiva: sobrou; negativa: faltou) junto com o resumo daquele momento.
create function public.fechar_caixa(p_valor_contado_centavos integer, p_observacao text default '')
returns public.caixas
language plpgsql security definer set search_path = '' as $$
declare
  v_caixa public.caixas;
  v_resumo jsonb;
begin
  if not public.eh_dono() then
    raise exception 'sem_permissao';
  end if;
  if p_valor_contado_centavos is null or p_valor_contado_centavos < 0 then
    raise exception 'valor_invalido';
  end if;
  -- Trava o caixa: pagamentos em andamento terminam antes, e os seguintes entram sem caixa.
  select * into v_caixa from public.caixas where fechado_em is null for update;
  if not found then
    raise exception 'caixa_fechado';
  end if;
  v_resumo := public.resumo_do_caixa(v_caixa.id);
  update public.caixas
    set fechado_em = now(),
        fechado_por = (select auth.uid()),
        valor_contado_centavos = p_valor_contado_centavos,
        esperado_centavos = (v_resumo ->> 'esperado_centavos')::integer,
        diferenca_centavos = p_valor_contado_centavos - (v_resumo ->> 'esperado_centavos')::integer,
        resumo = v_resumo -> 'por_forma',
        observacao = left(trim(coalesce(p_observacao, '')), 300)
    where id = v_caixa.id returning * into v_caixa;
  return v_caixa;
end $$;

-- Funções novas nascem executáveis por todos: fechamos e abrimos só para o dono logado (cada uma
-- confere o papel por dentro).
revoke all on function public.mudar_situacao(uuid, text, text) from public, anon, authenticated;
revoke all on function public.registrar_atendimento_avulso(uuid, text, text) from public, anon, authenticated;
revoke all on function public.estornar_venda(uuid, text) from public, anon, authenticated;
revoke all on function public.lancamentos_do_caixa(uuid) from public, anon, authenticated;
revoke all on function public.resumo_do_caixa(uuid) from public, anon, authenticated;
revoke all on function public.abrir_caixa(integer) from public, anon, authenticated;
revoke all on function public.fechar_caixa(integer, text) from public, anon, authenticated;
grant execute on function public.mudar_situacao(uuid, text, text) to authenticated;
grant execute on function public.registrar_atendimento_avulso(uuid, text, text) to authenticated;
grant execute on function public.estornar_venda(uuid, text) to authenticated;
grant execute on function public.lancamentos_do_caixa(uuid) to authenticated;
grant execute on function public.resumo_do_caixa(uuid) to authenticated;
grant execute on function public.abrir_caixa(integer) to authenticated;
grant execute on function public.fechar_caixa(integer, text) to authenticated;
