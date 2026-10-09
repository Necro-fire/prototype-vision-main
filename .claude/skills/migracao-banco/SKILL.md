---
name: migracao-banco
description: Use ao mudar qualquer coisa no banco do ON-STYLE: tabela, coluna, regra de acesso (RLS), função, gatilho, seed. Garante que a mudança vai numa migração nova, com RLS e teste, e prova que o teste acusa a falha.
---

# Migração do banco

O banco é Postgres no Supabase. Tudo que o banco decide (reserva sem conflito, quem lê o quê, estorno) está em `supabase/migrations/` e é provado por testes em `supabase/testes/`, que rodam num Postgres de verdade (PGlite) dentro do `npm test`.

## Regras

1. **Migração aplicada não se edita.** Crie outra, com o próximo número em ordem: `supabase/migrations/AAAAMMDDHHMMSS_assunto.sql`. A exceção é uma migração que ainda não foi aplicada em nenhum ambiente; hoje, as três primeiras ainda não foram para um projeto real.
2. **Toda tabela nasce com RLS ligada** (`alter table ... enable row level security`) e com `revoke`/`grant` explícitos. Tabela sem política não é lida por ninguém. O teste "toda tabela do schema public tem RLS ligada" falha se esquecer.
3. **Escrita sensível passa por função**, não por `insert` ou `update` direto da tela. A função é `security definer`, com `set search_path = ''`, valida a regra e levanta erro com **código estável** (`raise exception 'horario_indisponivel'`). A aplicação traduz o código em frase; nunca mostre a mensagem crua.
4. **Função nova**: `revoke` de `public`, `anon` e `authenticated`, e `grant execute` só a quem precisa. Funções nascem executáveis por todos; o teste do visitante pega o esquecimento.
5. **Dinheiro em centavos inteiros. Datas em `timestamptz`.** Dia, hora de abrir e grade se calculam no fuso `empresa.fuso` (America/Sao_Paulo), nunca no relógio do cliente.
6. **Cópia no registro**: agendamento e venda copiam nome, preço e duração do que foi escolhido. O catálogo não se apaga se tem histórico (`on delete restrict`); desativa-se.
7. **Papel de dono só muda direto no banco.** Nenhuma tela nem função promove alguém.
8. Dados pessoais só os mínimos (nome, e-mail, celular). Conta excluída anonimiza o histórico (`excluir_minha_conta`).

## Passo a passo

1. Escreva o teste primeiro em `supabase/testes/*.test.ts` (tem `// @vitest-environment node` na primeira linha). Use os auxiliares de `ambiente.ts`:
   - `criarBanco()` aplica as migrações e o seed do zero.
   - `criarUsuario`, `tornarDono`, `como(db, usuario | "anon", () => ...)` agem como cada pessoa, passando pelas mesmas regras de produção.
   - `emSaoPaulo`, `diasAteDiaDaSemana` montam datas no fuso da barbearia.
2. Escreva a migração. Rode `npx vitest run supabase`.
3. **Prove que o teste vale**: quebre a regra de propósito (tire a restrição, afrouxe um `grant`, esqueça o RLS), veja o teste falhar, e restaure. Teste que nunca falhou não prova nada.
4. Cubra o lado de quem **não** pode: visitante, cliente de outra conta, cliente tentando virar dono, e o dono.
5. Se mudou o formato de uma tabela, atualize `supabase/seed.sql` e os tipos usados pela aplicação.
6. Rode a Skill `verificar-entrega`.

## Aplicar num projeto real

O Claude **não aplica migração em produção** nem guarda a chave `service_role`. Em desenvolvimento, quem aplica é o dono do projeto (passo a passo em `docs/06-supabase.md`). Mudança de banco em produção passa por revisão e pela Skill `security-review`.

## O que o teste em Postgres emulado não cobre

O PGlite não é o Supabase: não tem o serviço de login, o tempo real nem a publicação `supabase_realtime`, que a migração 3 só ativa se existirem. A primeira aplicação num projeto real é, em si, um teste: confira `select * from pg_policies where schemaname = 'public'` e repita os testes de visitante e de cliente pela interface.
