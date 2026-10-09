-- ON-STYLE, Fase 7: cupons e cartão fidelidade (docs/02-arquitetura.md, regras F6 e F7).
-- O desconto é sempre calculado aqui no banco, a partir do preço copiado no agendamento ou do
-- preço do produto, e nunca passa do valor. Cupom e resgate de fidelidade não se somam.
-- Cupom tem validade, limite de usos e valor (percentual ou fixo). A fidelidade dá um serviço
-- grátis a cada N atendimentos concluídos; cancelado e falta não contam.

-- Cupons -----------------------------------------------------------------------------------
create table public.cupons (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (codigo ~ '^[A-Z0-9_-]{3,20}$'),
  tipo text not null check (tipo in ('percentual', 'valor')),
  -- Percentual: 1 a 100. Valor fixo: centavos.
  valor integer not null check (valor > 0),
  valido_ate timestamptz,
  limite_usos integer check (limite_usos > 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  check (tipo <> 'percentual' or valor <= 100)
);
alter table public.cupons enable row level security;
create policy cupons_ver on public.cupons for select to authenticated using (public.eh_dono());
revoke all on public.cupons from public, anon, authenticated;
grant select on public.cupons to authenticated;

-- Desconto concedido em cada atendimento e venda. O preço do atendimento continua o do serviço
-- (regra C1); o valor cobrado é o preço menos o desconto, que nunca passa do preço.
alter table public.agendamentos
  add column cupom_id uuid references public.cupons (id) on delete restrict,
  add column desconto_centavos integer not null default 0,
  add column resgate_fidelidade boolean not null default false,
  add constraint agendamentos_desconto_no_preco check (desconto_centavos between 0 and preco_centavos);
alter table public.vendas
  add column cupom_id uuid references public.cupons (id) on delete restrict;
create index agendamentos_cupom on public.agendamentos (cupom_id) where cupom_id is not null;
create index vendas_cupom on public.vendas (cupom_id) where cupom_id is not null;

-- Fidelidade -------------------------------------------------------------------------------
-- A regra mora na linha única da barbearia: ligada ou não, quantos atendimentos e qual serviço.
alter table public.empresa
  add column fidelidade_ativa boolean not null default false,
  add column fidelidade_atendimentos smallint not null default 10
    check (fidelidade_atendimentos between 2 and 100),
  add column fidelidade_servico_id uuid references public.servicos (id) on delete restrict,
  add constraint empresa_fidelidade_completa check (not fidelidade_ativa or fidelidade_servico_id is not null);

-- Um ponto por atendimento concluído, e -N a cada serviço grátis. O saldo é a soma.
create table public.fidelidade_movimentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.perfis (id) on delete cascade,
  pontos integer not null check (pontos <> 0),
  motivo text not null check (motivo in ('atendimento', 'resgate')),
  agendamento_id uuid references public.agendamentos (id) on delete set null,
  criado_em timestamptz not null default now()
);
create index fidelidade_movimentos_cliente on public.fidelidade_movimentos (cliente_id);
-- Um atendimento rende no máximo um ponto, e um resgate por atendimento.
create unique index fidelidade_movimentos_um_por_atendimento
  on public.fidelidade_movimentos (agendamento_id, motivo) where agendamento_id is not null;
alter table public.fidelidade_movimentos enable row level security;
create policy fidelidade_ver on public.fidelidade_movimentos for select to authenticated
  using (cliente_id = (select auth.uid()) or public.eh_dono());
revoke all on public.fidelidade_movimentos from public, anon, authenticated;
grant select on public.fidelidade_movimentos to authenticated;

create function public.saldo_interno_de_fidelidade(p_cliente_id uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(pontos), 0)::integer from public.fidelidade_movimentos where cliente_id = p_cliente_id
$$;
revoke all on function public.saldo_interno_de_fidelidade(uuid) from public, anon, authenticated;

-- O cliente vê o próprio saldo; o dono, o de qualquer um.
create function public.saldo_de_fidelidade(p_cliente_id uuid default null) returns integer
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_alvo uuid := coalesce(p_cliente_id, v_uid);
begin
  if v_uid is null then
    raise exception 'entre_na_conta';
  end if;
  if v_alvo <> v_uid and not public.eh_dono() then
    raise exception 'sem_permissao';
  end if;
  return public.saldo_interno_de_fidelidade(v_alvo);
end $$;

-- Cupons: regras ---------------------------------------------------------------------------
create function public.usos_do_cupom(p_id uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select (
    (select count(*) from public.agendamentos a
      where a.cupom_id = p_id and a.situacao not in ('cancelado', 'nao_compareceu'))
    + (select count(*) from public.vendas v where v.cupom_id = p_id and v.estornada_em is null)
  )::integer
$$;

-- Cancelamento, falta e estorno devolvem o uso. Fora de validade e esgotado deixam de valer.
create function public.situacao_do_cupom(p_cupom public.cupons) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when not p_cupom.ativo then 'inativo'
    when p_cupom.valido_ate is not null and p_cupom.valido_ate <= now() then 'vencido'
    when p_cupom.limite_usos is not null
      and public.usos_do_cupom(p_cupom.id) >= p_cupom.limite_usos then 'esgotado'
    else 'ativo'
  end
$$;

-- Percentual arredondado para baixo, valor fixo limitado ao total: nunca passa do total.
create function public.desconto_do_cupom(p_tipo text, p_valor integer, p_total_centavos integer)
returns integer
language sql immutable as $$
  select greatest(0, least(
    p_total_centavos,
    case p_tipo
      when 'percentual' then (p_total_centavos::bigint * p_valor / 100)::integer
      else p_valor
    end
  ))
$$;

-- Devolve o cupom se ele vale agora; senão levanta o motivo. `p_travar` segura a linha até o fim
-- da transação, para dois usos do último cupom não passarem juntos.
create function public.cupom_valido(p_codigo text, p_travar boolean default false) returns public.cupons
language plpgsql security definer set search_path = '' as $$
declare
  v_cupom public.cupons;
  v_codigo text := upper(trim(coalesce(p_codigo, '')));
begin
  if p_travar then
    select * into v_cupom from public.cupons where codigo = v_codigo for update;
  else
    select * into v_cupom from public.cupons where codigo = v_codigo;
  end if;
  if not found then
    raise exception 'cupom_invalido';
  end if;
  case public.situacao_do_cupom(v_cupom)
    when 'inativo' then raise exception 'cupom_invalido';
    when 'vencido' then raise exception 'cupom_vencido';
    when 'esgotado' then raise exception 'cupom_esgotado';
    else null;
  end case;
  return v_cupom;
end $$;
revoke all on function public.usos_do_cupom(uuid) from public, anon, authenticated;
revoke all on function public.situacao_do_cupom(public.cupons) from public, anon, authenticated;
revoke all on function public.desconto_do_cupom(text, integer, integer) from public, anon, authenticated;
revoke all on function public.cupom_valido(text, boolean) from public, anon, authenticated;

-- Quanto o cupom abate de um total, para a tela mostrar antes de confirmar. Não grava nada.
create function public.prever_desconto(p_codigo text, p_total_centavos integer) returns integer
language plpgsql stable security definer set search_path = '' as $$
declare
  v_cupom public.cupons;
begin
  if (select auth.uid()) is null then
    raise exception 'entre_na_conta';
  end if;
  if p_total_centavos is null or p_total_centavos < 0 then
    raise exception 'valor_invalido';
  end if;
  v_cupom := public.cupom_valido(p_codigo);
  return public.desconto_do_cupom(v_cupom.tipo, v_cupom.valor, p_total_centavos);
end $$;

-- Cupons: o dono cria e liga/desliga. Nada se apaga (o histórico guarda o uso).
create function public.criar_cupom(
  p_codigo text,
  p_tipo text,
  p_valor integer,
  p_valido_ate timestamptz default null,
  p_limite_usos integer default null
) returns public.cupons
language plpgsql security definer set search_path = '' as $$
declare
  v_codigo text := upper(trim(coalesce(p_codigo, '')));
  v_cupom public.cupons;
begin
  if not public.eh_dono() then
    raise exception 'sem_permissao';
  end if;
  if v_codigo !~ '^[A-Z0-9_-]{3,20}$' then
    raise exception 'cupom_codigo_invalido';
  end if;
  if p_tipo not in ('percentual', 'valor') or p_valor is null or p_valor <= 0
     or (p_tipo = 'percentual' and p_valor > 100) then
    raise exception 'cupom_valor_invalido';
  end if;
  if p_valido_ate is not null and p_valido_ate <= now() then
    raise exception 'cupom_validade_invalida';
  end if;
  if p_limite_usos is not null and p_limite_usos <= 0 then
    raise exception 'cupom_limite_invalido';
  end if;
  begin
    insert into public.cupons (codigo, tipo, valor, valido_ate, limite_usos)
    values (v_codigo, p_tipo, p_valor, p_valido_ate, p_limite_usos)
    returning * into v_cupom;
  exception when unique_violation then
    raise exception 'cupom_codigo_repetido';
  end;
  return v_cupom;
end $$;

create function public.mudar_cupom_ativo(p_id uuid, p_ativo boolean) returns public.cupons
language plpgsql security definer set search_path = '' as $$
declare
  v_cupom public.cupons;
begin
  if not public.eh_dono() then
    raise exception 'sem_permissao';
  end if;
  update public.cupons set ativo = p_ativo where id = p_id returning * into v_cupom;
  if not found then
    raise exception 'cupom_inexistente';
  end if;
  return v_cupom;
end $$;

create function public.listar_cupons()
returns table (
  id uuid, codigo text, tipo text, valor integer, valido_ate timestamptz,
  limite_usos integer, ativo boolean, usos integer, situacao text, criado_em timestamptz
)
language sql stable security definer set search_path = '' as $$
  select c.id, c.codigo, c.tipo, c.valor, c.valido_ate, c.limite_usos, c.ativo,
    public.usos_do_cupom(c.id), public.situacao_do_cupom(c), c.criado_em
  from public.cupons c
  where public.eh_dono()
  order by c.criado_em desc
$$;

-- Fidelidade: configuração e resgate ---------------------------------------------------------
create function public.salvar_fidelidade(p_ativa boolean, p_atendimentos integer, p_servico_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.eh_dono() then
    raise exception 'sem_permissao';
  end if;
  if p_atendimentos is null or p_atendimentos < 2 or p_atendimentos > 100 then
    raise exception 'fidelidade_invalida';
  end if;
  if p_ativa and p_servico_id is null then
    raise exception 'fidelidade_incompleta';
  end if;
  if p_servico_id is not null and not exists (select 1 from public.servicos where id = p_servico_id) then
    raise exception 'servico_indisponivel';
  end if;
  update public.empresa
    set fidelidade_ativa = p_ativa, fidelidade_atendimentos = p_atendimentos,
        fidelidade_servico_id = p_servico_id
    where id = 1;
end $$;

-- Gasta N pontos num atendimento do serviço escolhido pelo dono. Chamada só por mudar_situacao.
create function public.resgatar_fidelidade(p_a public.agendamentos) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_empresa public.empresa;
begin
  select * into v_empresa from public.empresa where id = 1;
  if not v_empresa.fidelidade_ativa then
    raise exception 'fidelidade_inativa';
  end if;
  if p_a.cliente_id is null then
    raise exception 'fidelidade_sem_cliente';
  end if;
  if p_a.servico_id <> v_empresa.fidelidade_servico_id then
    raise exception 'servico_do_resgate_invalido';
  end if;
  -- Trava o cliente: dois resgates ao mesmo tempo não gastam o mesmo saldo duas vezes.
  perform 1 from public.perfis where id = p_a.cliente_id for update;
  if public.saldo_interno_de_fidelidade(p_a.cliente_id) < v_empresa.fidelidade_atendimentos then
    raise exception 'saldo_insuficiente';
  end if;
  insert into public.fidelidade_movimentos (cliente_id, pontos, motivo, agendamento_id)
  values (p_a.cliente_id, -v_empresa.fidelidade_atendimentos, 'resgate', p_a.id);
end $$;
revoke all on function public.resgatar_fidelidade(public.agendamentos) from public, anon, authenticated;

-- Reservar com cupom ------------------------------------------------------------------------
drop function public.reservar(uuid, timestamptz, text);
create function public.reservar(
  p_servico_id uuid,
  p_inicio timestamptz,
  p_observacao text default '',
  p_cupom text default null
) returns public.agendamentos
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_perfil public.perfis;
  v_servico public.servicos;
  v_empresa public.empresa;
  v_cupom public.cupons;
  v_desconto integer := 0;
  v_fim timestamptz;
  v_novo public.agendamentos;
begin
  if v_uid is null then
    raise exception 'entre_na_conta';
  end if;
  select * into v_perfil from public.perfis where id = v_uid;
  if not found or length(trim(v_perfil.nome)) = 0 or coalesce(v_perfil.celular, '') = '' then
    raise exception 'perfil_incompleto';
  end if;
  select * into v_servico from public.servicos where id = p_servico_id and ativo;
  if not found then
    raise exception 'servico_indisponivel';
  end if;
  select * into v_empresa from public.empresa where id = 1;

  v_fim := p_inicio + make_interval(mins => v_servico.duracao_minutos);
  perform public.validar_janela(p_inicio, v_fim);

  if (
    select count(*) from public.agendamentos a
    where a.cliente_id = v_uid and a.situacao in ('agendado', 'confirmado') and a.inicio > now()
  ) >= v_empresa.max_agendamentos_futuros then
    raise exception 'limite_de_agendamentos';
  end if;

  if nullif(trim(coalesce(p_cupom, '')), '') is not null then
    v_cupom := public.cupom_valido(p_cupom, true);
    v_desconto := public.desconto_do_cupom(v_cupom.tipo, v_cupom.valor, v_servico.preco_centavos);
  end if;

  begin
    insert into public.agendamentos (
      cliente_id, cliente_nome, cliente_celular, servico_id, servico_nome,
      preco_centavos, duracao_minutos, inicio, fim, observacao, cupom_id, desconto_centavos
    ) values (
      v_uid, v_perfil.nome, v_perfil.celular, v_servico.id, v_servico.nome,
      v_servico.preco_centavos, v_servico.duracao_minutos, p_inicio, v_fim, coalesce(p_observacao, ''),
      v_cupom.id, v_desconto
    ) returning * into v_novo;
  exception when exclusion_violation then
    raise exception 'horario_indisponivel';
  end;
  return v_novo;
end $$;

-- Concluir com cupom ou com o serviço grátis da fidelidade ----------------------------------
drop function public.mudar_situacao(uuid, text, text);
create function public.mudar_situacao(
  p_id uuid,
  p_para text,
  p_forma_pagamento text default null,
  p_cupom text default null,
  p_resgatar_fidelidade boolean default false
) returns public.agendamentos
language plpgsql security definer set search_path = '' as $$
declare
  v_a public.agendamentos;
  v_cupom public.cupons;
  v_cupom_id uuid;
  v_desconto integer;
  v_resgate boolean := coalesce(p_resgatar_fidelidade, false);
  v_quer_cupom boolean := nullif(trim(coalesce(p_cupom, '')), '') is not null;
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

  if p_para <> 'concluido' then
    update public.agendamentos set situacao = p_para where id = p_id returning * into v_a;
    return v_a;
  end if;

  v_cupom_id := v_a.cupom_id;
  v_desconto := v_a.desconto_centavos;
  if v_resgate then
    if v_quer_cupom or v_a.cupom_id is not null then
      raise exception 'desconto_duplicado';
    end if;
    perform public.resgatar_fidelidade(v_a);
    v_desconto := v_a.preco_centavos;
  elsif v_quer_cupom then
    if v_a.cupom_id is not null then
      raise exception 'cupom_ja_aplicado';
    end if;
    v_cupom := public.cupom_valido(p_cupom, true);
    v_cupom_id := v_cupom.id;
    v_desconto := public.desconto_do_cupom(v_cupom.tipo, v_cupom.valor, v_a.preco_centavos);
  end if;

  -- Atendimento de graça não passa pelo caixa, então não pede forma de pagamento.
  if v_a.preco_centavos - v_desconto > 0 and p_forma_pagamento is null then
    raise exception 'forma_pagamento_obrigatoria';
  end if;

  update public.agendamentos
    set situacao = 'concluido',
        forma_pagamento = case when v_a.preco_centavos - v_desconto > 0 then p_forma_pagamento end,
        pago_em = now(),
        caixa_id = case when v_a.preco_centavos - v_desconto > 0 then public.caixa_aberto_travado() end,
        cupom_id = v_cupom_id,
        desconto_centavos = v_desconto,
        resgate_fidelidade = v_resgate
    where id = p_id returning * into v_a;

  -- Um ponto por atendimento concluído de quem tem conta, enquanto o programa estiver ligado. O
  -- atendimento que foi pago com pontos não rende ponto.
  if v_a.cliente_id is not null and not v_resgate
     and (select fidelidade_ativa from public.empresa where id = 1) then
    insert into public.fidelidade_movimentos (cliente_id, pontos, motivo, agendamento_id)
    values (v_a.cliente_id, 1, 'atendimento', v_a.id);
  end if;
  return v_a;
end $$;

-- Venda com cupom ---------------------------------------------------------------------------
drop function public.registrar_venda(jsonb, text, integer, timestamptz);
create function public.registrar_venda(
  p_itens jsonb,
  p_forma_pagamento text default null,
  p_desconto_centavos integer default 0,
  p_ocorrida_em timestamptz default now(),
  p_cupom text default null
) returns public.vendas
language plpgsql security definer set search_path = '' as $$
declare
  v_venda public.vendas;
  v_item record;
  v_produto public.produtos;
  v_cupom public.cupons;
  v_bruto integer := 0;
  v_desconto integer := coalesce(p_desconto_centavos, 0);
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

  if nullif(trim(coalesce(p_cupom, '')), '') is not null then
    if v_desconto <> 0 then
      raise exception 'desconto_duplicado';
    end if;
    v_cupom := public.cupom_valido(p_cupom, true);
    v_desconto := public.desconto_do_cupom(v_cupom.tipo, v_cupom.valor, v_bruto);
  end if;
  if v_desconto < 0 or v_desconto > v_bruto then
    raise exception 'desconto_invalido';
  end if;
  update public.vendas
    set total_centavos = v_bruto - v_desconto, desconto_centavos = v_desconto, cupom_id = v_cupom.id
    where id = v_venda.id returning * into v_venda;
  return v_venda;
end $$;

-- O caixa soma o que foi cobrado de fato: o preço menos o desconto.
create or replace function public.lancamentos_do_caixa(p_id uuid)
returns table (tipo text, origem_id uuid, forma_pagamento text, valor_centavos integer, em timestamptz)
language sql stable security definer set search_path = '' as $$
  select 'atendimento'::text, a.id, a.forma_pagamento, a.preco_centavos - a.desconto_centavos, a.pago_em
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

-- Funções novas nascem executáveis por todos: fechamos e abrimos só para quem precisa.
revoke all on function public.saldo_de_fidelidade(uuid) from public, anon, authenticated;
revoke all on function public.prever_desconto(text, integer) from public, anon, authenticated;
revoke all on function public.criar_cupom(text, text, integer, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.mudar_cupom_ativo(uuid, boolean) from public, anon, authenticated;
revoke all on function public.listar_cupons() from public, anon, authenticated;
revoke all on function public.salvar_fidelidade(boolean, integer, uuid) from public, anon, authenticated;
revoke all on function public.reservar(uuid, timestamptz, text, text) from public, anon, authenticated;
revoke all on function public.mudar_situacao(uuid, text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.registrar_venda(jsonb, text, integer, timestamptz, text) from public, anon, authenticated;
grant execute on function public.saldo_de_fidelidade(uuid) to authenticated;
grant execute on function public.prever_desconto(text, integer) to authenticated;
grant execute on function public.criar_cupom(text, text, integer, timestamptz, integer) to authenticated;
grant execute on function public.mudar_cupom_ativo(uuid, boolean) to authenticated;
grant execute on function public.listar_cupons() to authenticated;
grant execute on function public.salvar_fidelidade(boolean, integer, uuid) to authenticated;
grant execute on function public.reservar(uuid, timestamptz, text, text) to authenticated;
grant execute on function public.mudar_situacao(uuid, text, text, text, boolean) to authenticated;
grant execute on function public.registrar_venda(jsonb, text, integer, timestamptz, text) to authenticated;
