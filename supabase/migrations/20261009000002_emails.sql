-- ON-STYLE: e-mails do cliente (confirmação, lembrete, remarcação, cancelamento) e erro de envio
-- visível ao dono (docs/02-arquitetura.md, "E-mails").
-- O banco enche a fila sozinho, no mesmo momento em que o agendamento muda. Quem envia é o
-- servidor (rota /api/emails/processar), que só fala com o banco pelas funções abaixo.

alter table public.emails_fila
  add column agendamento_id uuid references public.agendamentos (id) on delete cascade;
create index emails_fila_agendamento on public.emails_fila (agendamento_id)
  where enviado_em is null;

-- Quando um e-mail esgota as tentativas, o sino do dono avisa.
alter table public.alertas drop constraint alertas_tipo_check;
alter table public.alertas add constraint alertas_tipo_check check (
  tipo in ('novo_agendamento', 'cancelamento', 'remarcacao', 'falta_sem_registro', 'email_falhou')
);

-- Enche a fila a partir das mudanças do agendamento. O texto do e-mail leva tudo de que precisa
-- em `dados`, já no fuso da barbearia, para o envio não depender de ler mais nada.
create function public.enfileirar_emails() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_email text;
  v_empresa public.empresa;
  v_dados jsonb;
  v_lembrar timestamptz;
begin
  if new.cliente_id is null then
    return null;
  end if;
  select email into v_email from auth.users where id = new.cliente_id;
  if v_email is null then
    return null;
  end if;
  select * into v_empresa from public.empresa where id = 1;
  v_dados := jsonb_build_object(
    'cliente_nome', new.cliente_nome,
    'servico', new.servico_nome,
    'inicio', to_char(new.inicio at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'fuso', v_empresa.fuso,
    'barbearia', v_empresa.nome,
    'endereco', v_empresa.endereco
  );

  if tg_op = 'INSERT' then
    insert into public.emails_fila (destinatario, modelo, dados, agendamento_id)
    values (v_email, 'confirmacao', v_dados, new.id);
  else
    if new.inicio <> old.inicio then
      insert into public.emails_fila (destinatario, modelo, dados, agendamento_id)
      values (
        v_email, 'remarcacao',
        v_dados || jsonb_build_object(
          'inicio_anterior', to_char(old.inicio at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
        ),
        new.id
      );
    end if;
    if new.situacao = 'cancelado' and old.situacao <> 'cancelado' then
      insert into public.emails_fila (destinatario, modelo, dados, agendamento_id)
      values (v_email, 'cancelamento', v_dados, new.id);
    end if;
  end if;

  -- O lembrete que ainda não saiu perde o sentido se o horário mudou ou deixou de valer.
  if tg_op = 'UPDATE'
     and (new.inicio <> old.inicio or new.situacao not in ('agendado', 'confirmado')) then
    delete from public.emails_fila
    where agendamento_id = new.id and modelo = 'lembrete' and enviado_em is null;
  end if;
  -- Lembrete na véspera, às 18h da barbearia, para o horário novo. Se o horário foi marcado
  -- depois disso, não há lembrete: a pessoa acabou de marcar.
  if (tg_op = 'INSERT' or new.inicio <> old.inicio) and new.situacao in ('agendado', 'confirmado') then
    v_lembrar := (((new.inicio at time zone v_empresa.fuso)::date - 1) + time '18:00')
      at time zone v_empresa.fuso;
    if v_lembrar > now() then
      insert into public.emails_fila (destinatario, modelo, dados, enviar_em, agendamento_id)
      values (v_email, 'lembrete', v_dados, v_lembrar, new.id);
    end if;
  end if;
  return null;
end $$;

create trigger agendamentos_emails after insert or update of inicio, situacao
  on public.agendamentos for each row execute function public.enfileirar_emails();

-- Quem envia chama estas três. `emails_reservar` entrega os e-mails que já podem sair e os
-- "empresta" por 10 minutos: dois envios ao mesmo tempo nunca pegam o mesmo e-mail, e um envio que
-- travou volta sozinho para a fila. Lembrete de quem desligou os lembretes, ou de horário que já
-- não está de pé, fica parado.
create function public.emails_reservar(p_limite integer default 20)
returns setof public.emails_fila
language sql security definer set search_path = '' as $$
  with escolhidos as (
    select f.id
    from public.emails_fila f
    where f.enviado_em is null
      and f.enviar_em <= now()
      and f.tentativas < 5
      and (
        f.modelo <> 'lembrete'
        or exists (
          select 1
          from public.agendamentos a
          join public.perfis p on p.id = a.cliente_id
          where a.id = f.agendamento_id
            and a.situacao in ('agendado', 'confirmado')
            and p.lembretes_por_email
        )
      )
    order by f.enviar_em
    limit greatest(p_limite, 0)
    for update of f skip locked
  )
  update public.emails_fila f
    set tentativas = f.tentativas + 1, enviar_em = now() + interval '10 minutes'
    from escolhidos e
    where f.id = e.id
    returning f.*
$$;

create function public.email_enviado(p_id uuid) returns void
language sql security definer set search_path = '' as $$
  update public.emails_fila set enviado_em = now(), erro = null where id = p_id
$$;

-- Falhou: guarda o motivo e tenta de novo mais tarde (5 min, 30 min, 2 h, 6 h). Na quinta falha,
-- desiste e avisa o dono pelo sino.
create function public.email_falhou(p_id uuid, p_erro text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_email public.emails_fila;
  v_nome text;
begin
  update public.emails_fila
    set erro = left(coalesce(p_erro, 'erro desconhecido'), 500),
        enviar_em = now() + case tentativas
          when 1 then interval '5 minutes'
          when 2 then interval '30 minutes'
          when 3 then interval '2 hours'
          else interval '6 hours'
        end
    where id = p_id and enviado_em is null
    returning * into v_email;
  if found and v_email.tentativas >= 5 then
    v_nome := case v_email.modelo
      when 'confirmacao' then 'de confirmação'
      when 'lembrete' then 'de lembrete'
      when 'remarcacao' then 'de remarcação'
      when 'cancelamento' then 'de cancelamento'
      else ''
    end;
    insert into public.alertas (tipo, texto, agendamento_id) values (
      'email_falhou',
      'Não conseguimos enviar o e-mail ' || v_nome || ' para ' || v_email.destinatario || '.',
      v_email.agendamento_id
    );
  end if;
end $$;

-- O dono manda tentar de novo um e-mail que desistiu.
create function public.reenviar_email(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.eh_dono() then
    raise exception 'sem_permissao';
  end if;
  update public.emails_fila
    set tentativas = 0, erro = null, enviar_em = now()
    where id = p_id and enviado_em is null;
  if not found then
    raise exception 'email_inexistente';
  end if;
end $$;

-- Função nova nasce executável por todos: fechamos e abrimos só para quem precisa.
revoke all on function public.enfileirar_emails() from public, anon, authenticated;
revoke all on function public.emails_reservar(integer) from public, anon, authenticated;
revoke all on function public.email_enviado(uuid) from public, anon, authenticated;
revoke all on function public.email_falhou(uuid, text) from public, anon, authenticated;
revoke all on function public.reenviar_email(uuid) from public, anon, authenticated;
grant execute on function public.emails_reservar(integer) to service_role;
grant execute on function public.email_enviado(uuid) to service_role;
grant execute on function public.email_falhou(uuid, text) to service_role;
grant execute on function public.reenviar_email(uuid) to authenticated;
