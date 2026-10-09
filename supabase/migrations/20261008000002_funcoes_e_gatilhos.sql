-- ON-STYLE: regras de negócio no banco (docs/02-arquitetura.md, regras A, C e F).
-- A tela nunca é a barreira: tudo que muda agendamento ou venda passa por estas funções.
-- Os erros usam códigos estáveis em `message` (ex.: horario_indisponivel); a aplicação traduz.

-- Cria o perfil junto com a conta. O papel sempre começa como cliente.
create function public.criar_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfis (id, nome, celular)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    nullif(new.raw_user_meta_data ->> 'celular', '')
  );
  return new;
end $$;

create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.criar_perfil();

create function public.eh_dono() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfis where id = (select auth.uid()) and papel = 'dono'
  )
$$;

-- Situações permitidas. Concluído, cancelado e "não compareceu" são finais.
create function public.transicao_permitida(p_de text, p_para text) returns boolean
language sql immutable as $$
  select case p_de
    when 'agendado' then p_para in ('confirmado', 'em_atendimento', 'cancelado', 'nao_compareceu')
    when 'confirmado' then p_para in ('em_atendimento', 'cancelado', 'nao_compareceu')
    when 'em_atendimento' then p_para = 'concluido'
    else false
  end
$$;

-- O atendimento inteiro cabe num intervalo de funcionamento do dia, no fuso da barbearia.
create function public.dentro_do_funcionamento(p_inicio timestamptz, p_fim timestamptz) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.empresa e
    join public.funcionamento f on f.dia_semana = extract(dow from (p_inicio at time zone e.fuso))::int
    where e.id = 1
      and (p_inicio at time zone e.fuso)::date = (p_fim at time zone e.fuso)::date
      and (p_inicio at time zone e.fuso)::time >= f.abre
      and (p_fim at time zone e.fuso)::time <= f.fecha
  )
$$;

-- Regras que valem para reservar e remarcar (A1, A4, A6, A7, A9).
create function public.validar_janela(p_inicio timestamptz, p_fim timestamptz) returns void
language plpgsql stable security definer set search_path = '' as $$
declare
  v_empresa public.empresa;
  v_local timestamp;
begin
  select * into v_empresa from public.empresa where id = 1;
  if p_inicio <= now() then
    raise exception 'horario_no_passado';
  end if;
  if p_inicio > now() + make_interval(days => v_empresa.antecedencia_max_dias) then
    raise exception 'horario_longe_demais';
  end if;
  v_local := p_inicio at time zone v_empresa.fuso;
  if extract(second from v_local) <> 0
     or (extract(hour from v_local)::int * 60 + extract(minute from v_local)::int) % v_empresa.grade_minutos <> 0 then
    raise exception 'horario_fora_da_grade';
  end if;
  if not public.dentro_do_funcionamento(p_inicio, p_fim) then
    raise exception 'fora_do_funcionamento';
  end if;
  if exists (
    select 1 from public.bloqueios b
    where tstzrange(b.inicio, b.fim, '[)') && tstzrange(p_inicio, p_fim, '[)')
  ) then
    raise exception 'horario_bloqueado';
  end if;
end $$;

-- Reserva atômica: confere tudo e grava na mesma transação. Se dois pedidos chegarem juntos
-- para o mesmo horário, a restrição de exclusão deixa passar um e recusa o outro.
create function public.reservar(p_servico_id uuid, p_inicio timestamptz, p_observacao text default '')
returns public.agendamentos
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_perfil public.perfis;
  v_servico public.servicos;
  v_empresa public.empresa;
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

  begin
    insert into public.agendamentos (
      cliente_id, cliente_nome, cliente_celular, servico_id, servico_nome,
      preco_centavos, duracao_minutos, inicio, fim, observacao
    ) values (
      v_uid, v_perfil.nome, v_perfil.celular, v_servico.id, v_servico.nome,
      v_servico.preco_centavos, v_servico.duracao_minutos, p_inicio, v_fim, coalesce(p_observacao, '')
    ) returning * into v_novo;
  exception when exclusion_violation then
    raise exception 'horario_indisponivel';
  end;
  return v_novo;
end $$;

-- O cliente cancela o próprio até o início (A10). O dono cancela qualquer um.
create function public.cancelar_agendamento(p_id uuid) returns public.agendamentos
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_a public.agendamentos;
begin
  if v_uid is null then
    raise exception 'entre_na_conta';
  end if;
  select * into v_a from public.agendamentos where id = p_id for update;
  if not found or not (v_a.cliente_id = v_uid or public.eh_dono()) then
    raise exception 'agendamento_inexistente';
  end if;
  if v_a.situacao not in ('agendado', 'confirmado') then
    raise exception 'situacao_final';
  end if;
  if v_a.inicio <= now() and not public.eh_dono() then
    raise exception 'ja_comecou';
  end if;
  update public.agendamentos set situacao = 'cancelado' where id = p_id returning * into v_a;
  return v_a;
end $$;

-- Só o dono muda a situação no dia a dia.
create function public.mudar_situacao(p_id uuid, p_para text) returns public.agendamentos
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
  update public.agendamentos set situacao = p_para where id = p_id returning * into v_a;
  return v_a;
end $$;

-- Remarcar mantém o serviço e passa pelas mesmas regras de horário de uma reserva nova.
create function public.remarcar(p_id uuid, p_novo_inicio timestamptz) returns public.agendamentos
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_a public.agendamentos;
  v_fuso text;
begin
  if v_uid is null then
    raise exception 'entre_na_conta';
  end if;
  select * into v_a from public.agendamentos where id = p_id for update;
  if not found or not (v_a.cliente_id = v_uid or public.eh_dono()) then
    raise exception 'agendamento_inexistente';
  end if;
  if v_a.situacao not in ('agendado', 'confirmado') then
    raise exception 'situacao_final';
  end if;
  if v_a.inicio <= now() and not public.eh_dono() then
    raise exception 'ja_comecou';
  end if;
  perform public.validar_janela(p_novo_inicio, p_novo_inicio + make_interval(mins => v_a.duracao_minutos));
  begin
    update public.agendamentos
      set inicio = p_novo_inicio,
          fim = p_novo_inicio + make_interval(mins => v_a.duracao_minutos),
          situacao = 'agendado'
      where id = p_id returning * into v_a;
  exception when exclusion_violation then
    raise exception 'horario_indisponivel';
  end;
  if v_a.cliente_id = v_uid then
    select fuso into v_fuso from public.empresa where id = 1;
    insert into public.alertas (tipo, texto, agendamento_id) values (
      'remarcacao',
      v_a.cliente_nome || ' remarcou ' || v_a.servico_nome || ' para '
        || to_char(v_a.inicio at time zone v_fuso, 'DD/MM "às" HH24:MI') || '.',
      v_a.id
    );
  end if;
  return v_a;
end $$;

-- Períodos ocupados de um dia, sem nome nem serviço: é só o que o site público precisa para
-- calcular os horários livres, e não expõe ninguém (falha S3).
create function public.horarios_ocupados(p_dia date) returns table (inicio timestamptz, fim timestamptz)
language sql stable security definer set search_path = '' as $$
  with dia as (
    select
      p_dia::timestamp at time zone e.fuso as de,
      (p_dia + 1)::timestamp at time zone e.fuso as ate
    from public.empresa e where e.id = 1
  )
  select a.inicio, a.fim
  from public.agendamentos a, dia
  where a.situacao not in ('cancelado', 'nao_compareceu') and a.inicio < dia.ate and a.fim > dia.de
  union all
  select b.inicio, b.fim
  from public.bloqueios b, dia
  where b.inicio < dia.ate and b.fim > dia.de
  order by 1
$$;

-- Registra a venda com preço e nome copiados do produto. `total_centavos` já é o valor cobrado,
-- depois do desconto.
create function public.registrar_venda(
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
  insert into public.vendas (total_centavos, forma_pagamento, ocorrida_em, criado_por)
  values (0, p_forma_pagamento, p_ocorrida_em, (select auth.uid()))
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

create function public.estornar_venda(p_id uuid) returns public.vendas
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
  update public.vendas set estornada_em = now() where id = p_id returning * into v_venda;
  return v_venda;
end $$;

-- LGPD: o histórico fica para o caixa, mas sem identificar a pessoa.
create function public.excluir_minha_conta() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'entre_na_conta';
  end if;
  if public.eh_dono() then
    raise exception 'dono_nao_pode_excluir';
  end if;
  update public.agendamentos
    set cliente_nome = 'Cliente removido', cliente_celular = ''
    where cliente_id = v_uid;
  delete from auth.users where id = v_uid;
end $$;

-- Gatilhos --------------------------------------------------------------------------------

create function public.ao_mudar_agendamento() returns trigger
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
    insert into public.alertas (tipo, texto, agendamento_id) values (
      'novo_agendamento',
      new.cliente_nome || ' agendou ' || new.servico_nome || ' para ' || v_quando || '.',
      new.id
    );
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

create trigger agendamentos_depois after insert or update of situacao on public.agendamentos
  for each row execute function public.ao_mudar_agendamento();

create function public.carimbar_atualizacao() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

create trigger agendamentos_atualizado before update on public.agendamentos
  for each row execute function public.carimbar_atualizacao();
create trigger empresa_atualizada before update on public.empresa
  for each row execute function public.carimbar_atualizacao();

-- Não se cria bloqueio sobre agendamento ativo sem antes resolver o agendamento (A6).
create function public.antes_de_bloqueio() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.criado_por := (select auth.uid());
  end if;
  if exists (
    select 1 from public.agendamentos a
    where a.situacao in ('agendado', 'confirmado', 'em_atendimento')
      and tstzrange(a.inicio, a.fim, '[)') && tstzrange(new.inicio, new.fim, '[)')
  ) then
    raise exception 'bloqueio_com_agendamento';
  end if;
  return new;
end $$;

create trigger bloqueios_antes before insert or update on public.bloqueios
  for each row execute function public.antes_de_bloqueio();
