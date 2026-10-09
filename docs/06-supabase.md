# 06 — Criar e configurar o Supabase

Passo a passo para você, dono do projeto. O banco já está escrito e testado no computador (70 testes em [supabase/testes](../supabase/testes)); falta só criar o projeto na sua conta, onde mora a segurança de verdade. Leva uns 20 minutos.

> **Segredos.** Nunca cole no chat, no código nem num e-mail: a chave `service_role` e a senha do banco. Para continuar o trabalho eu preciso só de dois valores públicos (passo 5).

## 1. Criar o projeto

1. Entre em https://supabase.com e crie a conta (plano gratuito).
2. **New project**. Nome: `onstyle-dev`. Região: **South America (São Paulo)**.
3. Defina a senha do banco e **guarde num gerenciador de senhas**. Você não vai precisar dela no dia a dia.
4. Espere uns minutos até o projeto ficar pronto.

Para a publicação, crie depois um segundo projeto, `onstyle-prod`. O plano gratuito permite dois. As mudanças sempre passam primeiro pelo `dev`.

## 2. Aplicar as migrações

Caminho mais simples, sem instalar nada:

1. No painel do projeto: **SQL Editor** → **New query**.
2. Abra no seu computador, nesta ordem, cada arquivo de [supabase/migrations](../supabase/migrations), cole o conteúdo e clique **Run**:
   1. `20261008000001_tabelas.sql`
   2. `20261008000002_funcoes_e_gatilhos.sql`
   3. `20261008000003_acesso.sql`
3. Depois cole e rode [supabase/seed.sql](../supabase/seed.sql). Ele cria os 6 serviços, os 3 produtos e o horário de segunda a sábado, das 9h às 19h. Troque pelos dados reais antes de publicar.

Cada um deve terminar com **Success**. Se algum der erro, copie a mensagem inteira e me envie: a primeira aplicação num projeto real é também um teste do que foi feito no computador.

## 3. Conferir que está fechado

No **SQL Editor**, rode:

```sql
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1;
```

Todas as linhas precisam mostrar `rowsecurity = true`. Em **Authentication → Policies** devem aparecer as regras de cada tabela.

## 4. Configurar o login

1. **Authentication → Sign In / Providers**: deixe **Email** ligado, com **Confirm email** ligado.
2. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:8080` (depois, o endereço do site).
   - Redirect URLs: `http://localhost:8080/**`
3. Entrar com Google fica para depois: exige criar um cliente OAuth no Google Cloud, e eu te guio quando chegar a hora.

## 5. Me passar as chaves públicas

Em **Project Settings → API**, copie:

- **Project URL** (algo como `https://abcdefgh.supabase.co`)
- **anon public key** (a chave `anon`, começa com `eyJ...`)

Essas duas são públicas por desenho: quem protege os dados são as regras de acesso do passo 2. Elas vão no arquivo `.env`, copiado de [.env.example](../.env.example):

```
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

O `.env` nunca vai para o git. **Não envie a `service_role`.**

## 6. Criar a conta do dono

1. Quando o login do site estiver pronto, crie a sua conta normalmente pelo site (ou, antes disso, em **Authentication → Users → Add user**).
2. No **SQL Editor**, promova essa conta a dono (troque o e-mail):

```sql
update public.perfis
set papel = 'dono'
where id = (select id from auth.users where email = 'seu-email@exemplo.com');
```

Essa é a **única** forma de virar dono: nenhuma tela nem função faz isso. Confira:

```sql
select p.nome, p.papel, u.email from public.perfis p join auth.users u on u.id = p.id;
```

## O que fica para depois

E-mails automáticos e o envio pela Resend (Fase 4), Google (junto do login) e o projeto de produção (Fase 5).
