-- ON-STYLE: tabelas da primeira versão (docs/02-arquitetura.md).
-- Regras gerais: dinheiro em centavos inteiros, datas como instante com fuso (timestamptz),
-- situações em texto sem acento, e toda tabela nasce com RLS ligada (migração 3).

create extension if not exists btree_gist with schema extensions;

-- Uma linha por conta. O papel só muda direto no banco, nunca pela aplicação.
create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  celular text,
  papel text not null default 'cliente' check (papel in ('cliente', 'dono')),
  lembretes_por_email boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Linha única com os dados da barbearia e as regras da agenda.
create table public.empresa (
  id smallint primary key default 1 check (id = 1),
  nome text not null default 'ON-STYLE',
  endereco text,
  telefone text,
  whatsapp text,
  instagram text,
  fuso text not null default 'America/Sao_Paulo',
  grade_minutos smallint not null default 30 check (grade_minutos in (10, 15, 20, 30, 60)),
  antecedencia_max_dias smallint not null default 30 check (antecedencia_max_dias between 1 and 365),
  max_agendamentos_futuros smallint not null default 3 check (max_agendamentos_futuros between 1 and 20),
  atualizado_em timestamptz not null default now()
);
insert into public.empresa default values;

-- Intervalos de funcionamento por dia da semana (0 = domingo). O almoço é o espaço entre dois.
create table public.funcionamento (
  id uuid primary key default gen_random_uuid(),
  dia_semana smallint not null check (dia_semana between 0 and 6),
  abre time not null,
  fecha time not null,
  check (fecha > abre),
  constraint funcionamento_sem_sobreposicao exclude using gist (
    dia_semana with =,
    numrange(extract(epoch from abre)::numeric, extract(epoch from fecha)::numeric) with &&
  )
);

-- Períodos indisponíveis: feriado, férias, saída.
create table public.bloqueios (
  id uuid primary key default gen_random_uuid(),
  inicio timestamptz not null,
  fim timestamptz not null,
  motivo text not null default '',
  criado_por uuid references public.perfis (id) on delete set null,
  criado_em timestamptz not null default now(),
  check (fim > inicio)
);

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique check (length(trim(nome)) > 0),
  ordem integer not null default 0
);

create table public.servicos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid references public.categorias (id) on delete set null,
  nome text not null check (length(trim(nome)) > 0),
  descricao text not null default '',
  preco_centavos integer not null check (preco_centavos >= 0),
  duracao_minutos smallint not null check (duracao_minutos between 5 and 480 and duracao_minutos % 5 = 0),
  ativo boolean not null default true,
  destaque boolean not null default false,
  ordem integer not null default 0,
  foto_url text,
  criado_em timestamptz not null default now()
);

create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  descricao text not null default '',
  preco_centavos integer not null check (preco_centavos >= 0),
  ativo boolean not null default true,
  ordem integer not null default 0,
  foto_url text,
  criado_em timestamptz not null default now()
);

-- Nome, celular, preço e duração são copiados no momento da reserva: mudar o serviço depois não
-- altera o que já foi marcado. O cliente fica nulo se a conta for excluída (a cópia é anonimizada).
create table public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.perfis (id) on delete set null,
  cliente_nome text not null,
  cliente_celular text not null,
  servico_id uuid not null references public.servicos (id) on delete restrict,
  servico_nome text not null,
  preco_centavos integer not null check (preco_centavos >= 0),
  duracao_minutos smallint not null check (duracao_minutos > 0),
  inicio timestamptz not null,
  fim timestamptz not null,
  situacao text not null default 'agendado'
    check (situacao in ('agendado', 'confirmado', 'em_atendimento', 'concluido', 'cancelado', 'nao_compareceu')),
  observacao text not null default '',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (fim > inicio),
  -- Dois agendamentos ativos nunca se sobrepõem, nem se chegarem no mesmo instante.
  -- Cancelado e "não compareceu" liberam o horário.
  constraint agendamentos_sem_sobreposicao exclude using gist (tstzrange(inicio, fim, '[)') with &&)
    where (situacao not in ('cancelado', 'nao_compareceu'))
);
create index agendamentos_cliente_inicio on public.agendamentos (cliente_id, inicio);
create index agendamentos_inicio on public.agendamentos (inicio);

create table public.agendamento_eventos (
  id uuid primary key default gen_random_uuid(),
  agendamento_id uuid not null references public.agendamentos (id) on delete cascade,
  de text,
  para text not null,
  por uuid references public.perfis (id) on delete set null,
  em timestamptz not null default now()
);
create index agendamento_eventos_agendamento on public.agendamento_eventos (agendamento_id);

-- Venda de produtos. Não se apaga: estorna-se, e o estorno fica no histórico.
create table public.vendas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.perfis (id) on delete set null,
  total_centavos integer not null check (total_centavos >= 0),
  desconto_centavos integer not null default 0 check (desconto_centavos >= 0),
  forma_pagamento text check (forma_pagamento in ('pix', 'dinheiro', 'debito', 'credito')),
  ocorrida_em timestamptz not null default now(),
  estornada_em timestamptz,
  criado_por uuid references public.perfis (id) on delete set null,
  criado_em timestamptz not null default now()
);

create table public.venda_itens (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.vendas (id) on delete cascade,
  produto_id uuid not null references public.produtos (id) on delete restrict,
  produto_nome text not null,
  preco_centavos integer not null check (preco_centavos >= 0),
  quantidade integer not null check (quantidade > 0)
);
create index venda_itens_venda on public.venda_itens (venda_id);

-- Avisos do sino do dono.
create table public.alertas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('novo_agendamento', 'cancelamento', 'remarcacao', 'falta_sem_registro')),
  texto text not null,
  agendamento_id uuid references public.agendamentos (id) on delete cascade,
  criado_em timestamptz not null default now(),
  lido_em timestamptz
);
create index alertas_nao_lidos on public.alertas (criado_em desc) where lido_em is null;

-- Fila de e-mails. Só a função de envio (service_role) a processa.
create table public.emails_fila (
  id uuid primary key default gen_random_uuid(),
  destinatario text not null,
  modelo text not null,
  dados jsonb not null default '{}'::jsonb,
  enviar_em timestamptz not null default now(),
  enviado_em timestamptz,
  tentativas smallint not null default 0,
  erro text,
  criado_em timestamptz not null default now()
);
create index emails_fila_pendentes on public.emails_fila (enviar_em) where enviado_em is null;
