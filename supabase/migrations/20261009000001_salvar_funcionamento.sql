-- ON-STYLE: o dono troca o funcionamento inteiro de uma vez, tudo ou nada.
-- Sem esta função, a tela teria de apagar e inserir linha por linha: uma falha no meio deixaria a
-- barbearia sem horário nenhum. Aqui o Postgres desfaz tudo se algum intervalo for inválido.

-- Cada item: { "dia_semana": 0-6 (0 = domingo), "abre": "HH:MM", "fecha": "HH:MM" }.
-- O almoço é o espaço entre dois intervalos do mesmo dia. Lista vazia fecha a barbearia.
create function public.salvar_funcionamento(p_intervalos jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_item jsonb;
begin
  if not public.eh_dono() then
    raise exception 'sem_permissao';
  end if;
  if jsonb_typeof(p_intervalos) is distinct from 'array' then
    raise exception 'intervalos_invalidos';
  end if;

  delete from public.funcionamento where true;

  for v_item in select * from jsonb_array_elements(p_intervalos) loop
    insert into public.funcionamento (dia_semana, abre, fecha)
    values (
      (v_item ->> 'dia_semana')::smallint,
      (v_item ->> 'abre')::time,
      (v_item ->> 'fecha')::time
    );
  end loop;
exception
  when exclusion_violation then
    raise exception 'intervalos_sobrepostos';
  when check_violation or invalid_text_representation or datetime_field_overflow
       or invalid_datetime_format or not_null_violation then
    raise exception 'intervalo_invalido';
end $$;

-- Função nova nasce executável por todos: fechamos e abrimos só para quem entrou.
revoke all on function public.salvar_funcionamento(jsonb) from public, anon, authenticated;
grant execute on function public.salvar_funcionamento(jsonb) to authenticated;
