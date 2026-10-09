-- ON-STYLE: dados iniciais de demonstração. São os serviços e produtos do protótipo, em centavos.
-- Troque pelos dados reais da barbearia antes de publicar (Fase 5).

insert into public.funcionamento (dia_semana, abre, fecha)
select dia, time '09:00', time '19:00' from generate_series(1, 6) as dia;

insert into public.categorias (nome, ordem) values
  ('Cortes', 1), ('Barba', 2), ('Tratamentos', 3), ('Sobrancelha', 4), ('FreeStyle', 5);

insert into public.servicos (categoria_id, nome, descricao, preco_centavos, duracao_minutos, destaque, ordem)
select c.id, s.nome, s.descricao, s.preco, s.duracao, s.destaque, s.ordem
from (values
  ('Cortes', 'Corte clássico', 'Na tesoura ou máquina. Acabamento preciso, estilo que permanece.', 4500, 30, false, 1),
  ('Barba', 'Barba & navalha', 'Toalha quente, desenho da barba e o ritual da navalha.', 3500, 30, false, 2),
  ('Cortes', 'Corte + barba', 'O cuidado completo. Seu corte e sua barba em perfeita sintonia.', 7000, 60, true, 3),
  ('Tratamentos', 'Hidratação capilar', 'Renovação e cuidado profundo para um cabelo saudável.', 3000, 30, false, 4),
  ('Sobrancelha', 'Sobrancelha', 'Limpeza e definição na medida certa, sem perder a naturalidade.', 1500, 15, false, 5),
  ('FreeStyle', 'FreeStyle', 'Personalidade em cada traço. Um desenho feito só para você.', 6000, 60, false, 6)
) as s (categoria, nome, descricao, preco, duracao, destaque, ordem)
join public.categorias c on c.nome = s.categoria;

insert into public.produtos (nome, descricao, preco_centavos, ordem) values
  ('Máquina de acabamento', 'Precisão profissional · Bivolt', 18900, 1),
  ('Tesoura de corte', 'Aço inoxidável · 6 polegadas', 8900, 2),
  ('Pente profissional', 'Antiestático · Uso diário', 2500, 3);
