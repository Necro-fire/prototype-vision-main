-- ON-STYLE: fotos de serviços e produtos (Storage do Supabase).
-- As fotos ficam num bucket público, `catalogo`, e o endereço de cada uma vai em
-- `servicos.foto_url` e `produtos.foto_url`. Qualquer visitante vê as fotos (é um site); só o dono
-- envia, troca e apaga. O limite de tamanho e de formato vale no próprio bucket, não só na tela.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalogo', 'catalogo', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Trocar ou apagar uma foto exige também poder ver o arquivo, por isso o `select`.
create policy catalogo_fotos_ver on storage.objects for select to authenticated
  using (bucket_id = 'catalogo' and public.eh_dono());
create policy catalogo_fotos_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'catalogo' and public.eh_dono());
create policy catalogo_fotos_trocar on storage.objects for update to authenticated
  using (bucket_id = 'catalogo' and public.eh_dono())
  with check (bucket_id = 'catalogo' and public.eh_dono());
create policy catalogo_fotos_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'catalogo' and public.eh_dono());
