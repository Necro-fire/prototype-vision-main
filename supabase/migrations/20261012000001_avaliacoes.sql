-- ON-STYLE, Fase 8: avaliações de clientes.
-- Só avalia quem teve o atendimento (concluído, na própria conta), uma vez por atendimento.
-- A avaliação entra publicada e o dono pode ocultar. O site público lê só pelas funções
-- abaixo, que devolvem o primeiro nome e a inicial do sobrenome, nunca o cadastro inteiro.

create table public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  agendamento_id uuid not null unique references public.agendamentos (id) on delete cascade,
  -- Excluir a conta apaga as avaliações da pessoa (nome e texto são dados pessoais).
  cliente_id uuid references public.perfis (id) on delete cascade,
  autor_nome text not null,
  nota smallint not null check (nota between 1 and 5),
  comentario text not null default '' check (length(comentario) <= 500),
  publicada boolean not null default true,
  criada_em timestamptz not null default now()
);
alter table public.avaliacoes enable row level security;
create policy avaliacoes_ver on public.avaliacoes for select to authenticated
  using (cliente_id = (select auth.uid()) or public.eh_dono());
revoke all on public.avaliacoes from public, anon, authenticated;
grant select on public.avaliacoes to authenticated;

-- O sino do dono avisa de cada avaliação nova.
alter table public.alertas drop constraint alertas_tipo_check;
alter table public.alertas add constraint alertas_tipo_check check (
  tipo in (
    'novo_agendamento', 'cancelamento', 'remarcacao', 'falta_sem_registro', 'email_falhou',
    'nova_avaliacao'
  )
);

-- "Maria Souza Lima" vira "Maria L."; nome único fica como está.
create function public.nome_para_exibicao(p_nome text) returns text
language sql immutable as $$
  select case
    when partes[1] = '' then 'Cliente'
    when array_length(partes, 1) = 1 then partes[1]
    else partes[1] || ' ' || upper(left(partes[array_length(partes, 1)], 1)) || '.'
  end
  from (select regexp_split_to_array(trim(coalesce(p_nome, '')), '\s+') as partes) p
  where true
$$;
revoke all on function public.nome_para_exibicao(text) from public, anon, authenticated;

create function public.avaliar(p_agendamento_id uuid, p_nota integer, p_comentario text default '')
returns public.avaliacoes
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_a public.agendamentos;
  v_perfil public.perfis;
  v_comentario text := trim(coalesce(p_comentario, ''));
  v_nova public.avaliacoes;
begin
  if v_uid is null then
    raise exception 'entre_na_conta';
  end if;
  if p_nota is null or p_nota < 1 or p_nota > 5 then
    raise exception 'nota_invalida';
  end if;
  if length(v_comentario) > 500 then
    raise exception 'comentario_longo';
  end if;
  select * into v_a from public.agendamentos where id = p_agendamento_id and cliente_id = v_uid;
  if not found then
    raise exception 'agendamento_inexistente';
  end if;
  if v_a.situacao <> 'concluido' then
    raise exception 'avaliacao_indisponivel';
  end if;
  select * into v_perfil from public.perfis where id = v_uid;
  begin
    insert into public.avaliacoes (agendamento_id, cliente_id, autor_nome, nota, comentario)
    values (v_a.id, v_uid, public.nome_para_exibicao(v_perfil.nome), p_nota, v_comentario)
    returning * into v_nova;
  exception when unique_violation then
    raise exception 'ja_avaliado';
  end;
  insert into public.alertas (tipo, texto, agendamento_id) values (
    'nova_avaliacao',
    v_nova.autor_nome || ' avaliou ' || v_a.servico_nome || ' com ' || p_nota
      || case when p_nota = 1 then ' estrela.' else ' estrelas.' end,
    v_a.id
  );
  return v_nova;
end $$;

-- O dono oculta uma avaliação (ou volta a publicá-la). Nada se apaga.
create function public.moderar_avaliacao(p_id uuid, p_publicada boolean) returns public.avaliacoes
language plpgsql security definer set search_path = '' as $$
declare
  v_av public.avaliacoes;
begin
  if not public.eh_dono() then
    raise exception 'sem_permissao';
  end if;
  update public.avaliacoes set publicada = p_publicada where id = p_id returning * into v_av;
  if not found then
    raise exception 'avaliacao_inexistente';
  end if;
  return v_av;
end $$;

-- O que o site público mostra: só as publicadas, sem identificar a conta.
create function public.avaliacoes_publicas(p_limite integer default 30)
returns table (nota smallint, comentario text, autor_nome text, criada_em timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.nota, a.comentario, a.autor_nome, a.criada_em
  from public.avaliacoes a
  where a.publicada
  order by a.criada_em desc
  limit least(greatest(coalesce(p_limite, 30), 1), 100)
$$;

create function public.resumo_das_avaliacoes() returns table (media numeric, total integer)
language sql stable security definer set search_path = '' as $$
  select round(avg(a.nota), 1), count(*)::integer from public.avaliacoes a where a.publicada
$$;

revoke all on function public.avaliar(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.moderar_avaliacao(uuid, boolean) from public, anon, authenticated;
revoke all on function public.avaliacoes_publicas(integer) from public, anon, authenticated;
revoke all on function public.resumo_das_avaliacoes() from public, anon, authenticated;
grant execute on function public.avaliar(uuid, integer, text) to authenticated;
grant execute on function public.moderar_avaliacao(uuid, boolean) to authenticated;
grant execute on function public.avaliacoes_publicas(integer) to anon, authenticated;
grant execute on function public.resumo_das_avaliacoes() to anon, authenticated;
