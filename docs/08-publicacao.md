# Publicação (Fase 5)

Este guia leva o site do computador ao endereço da barbearia. O código já está pronto e foi conferido no ambiente da Cloudflare, em máquina local (veja "O que está provado"). O que falta são as contas e o domínio, que são seus.

## O que você precisa ter

| Item                         | Para quê                                           | Custo                                             |
| ---------------------------- | -------------------------------------------------- | ------------------------------------------------- |
| Conta na Cloudflare          | Hospedar o site (Workers)                          | Plano gratuito atende uma barbearia               |
| Domínio da barbearia         | O endereço (`onstyle.com.br`...)                   | Cerca de R$ 40 por ano no Registro.br             |
| Conta no Resend              | E-mails (agendamento, lembrete) e e-mails de login | Gratuito até 3.000 e-mails por mês (100 por dia)  |
| Projeto Supabase de produção | O banco                                            | Gratuito, com limites (veja "Cópia de segurança") |

Dica: faça tudo primeiro com o endereço gratuito que a Cloudflare dá (`onstyle.<seu-usuario>.workers.dev`) e só depois ligue o domínio. Assim o ensaio acontece sem pressa.

## 1. Publicar na Cloudflare

1. No painel da Cloudflare: **Workers & Pages** > **Create** > **Import a repository** e escolha o repositório do GitHub.
2. **Production branch**: `main`. Cada vez que algo entra na `main`, o site é publicado de novo.
3. **Build command**: `npm run build`. **Deploy command**: `npx wrangler deploy`.
4. Em **Variables and secrets**, de **build** (públicas, entram no site; o prefixo `VITE_` é isso):
   - `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`: os mesmos do `.env`.
   - `VITE_SITE_URL`: o endereço do site, sem barra no fim (`https://onstyle.com.br`). Aparece nos links dos e-mails e na imagem de compartilhamento.
   - `NODE_VERSION`: `24`.
5. Em **Variables and secrets**, de **execução**, como **Secret** (nunca como texto):
   - `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_REMETENTE` e `CRON_SECRET` (descritos em `docs/07-emails.md`).
6. Publique. O primeiro endereço aparece no fim da execução. Abra `/api/saude`: deve responder `{"ok":true}`.

Se você trocar uma variável `VITE_*`, é preciso publicar de novo (ela entra na compilação). Os segredos de execução valem na hora.

## 2. Ligar o domínio

1. No Worker `onstyle`: **Settings** > **Domains & Routes** > **Add** > **Custom domain** e digite o domínio.
2. Se o domínio não estiver na Cloudflare, ela pede para trocar os servidores de nome (nameservers) no Registro.br. É o caminho mais simples e dá HTTPS automático.
3. Atualize `VITE_SITE_URL` para o domínio e publique de novo.

## 3. Ajustar o Supabase para o endereço novo

No painel do Supabase, **Authentication** > **URL Configuration**:

- **Site URL**: `https://onstyle.com.br`.
- **Redirect URLs**: acrescente `https://onstyle.com.br/**`. Pode manter `http://localhost:*/**` para o desenvolvimento.

Sem isso, o link do e-mail de confirmação e o de recuperar a senha levam ao endereço errado.

**Authentication** > **Sign In / Providers** > **Email**: deixe "Confirm email" ligado e a senha mínima em 8 ou mais.

## 4. E-mails pelo domínio da barbearia

O e-mail padrão do Supabase é limitado a poucos envios por hora e sai de um endereço genérico: serve para testar, não para uma barbearia com clientes se cadastrando. Em produção, use o Resend para tudo.

1. No Resend: **Domains** > **Add Domain**, com o domínio da barbearia. Ele mostra registros DNS (SPF e DKIM) para você criar na Cloudflare. Espere ficar **Verified**.
2. Troque `EMAIL_REMETENTE` por algo como `ON-STYLE <agenda@onstyle.com.br>`.
3. Para os e-mails de **login** (confirmar conta, recuperar senha), no Supabase: **Authentication** > **Emails** > **SMTP Settings** > **Enable custom SMTP**:
   - Host `smtp.resend.com`, porta `465`, usuário `resend`, senha: a chave de API do Resend.
   - Remetente: o mesmo endereço do domínio.
4. Confira se o e-mail não cai em spam: crie uma conta de teste com um Gmail e veja onde o e-mail chega.

## 5. O agendador dos e-mails

Com o site no ar, ligue o agendador descrito em `docs/07-emails.md` ("Agendador em produção"), apontando para `https://onstyle.com.br/api/emails/processar`.

## 6. Monitoramento

- **Disponibilidade**: crie um monitor gratuito no [UptimeRobot](https://uptimerobot.com) (ou nos Health Checks da Cloudflare) para `https://onstyle.com.br/api/saude`, a cada 5 minutos, com aviso por e-mail. A rota responde 200 quando o site e o banco funcionam e 503 quando não.
- **Erros**: os registros do servidor (incluindo erros de página) ficam em **Workers & Pages** > `onstyle` > **Logs**. Já está ligado em `wrangler.jsonc`.
- **E-mails que falham**: aparecem no sino do painel (veja `docs/07-emails.md`).

## 7. Cópia de segurança semanal

O plano gratuito do Supabase **não** guarda cópias. A rotina `.github/workflows/backup.yml` gera uma cópia cifrada do banco todo domingo e a guarda no GitHub por 90 dias.

1. No Supabase: **Connect** > **Session pooler** e copie a URL (`postgresql://postgres.<projeto>:[SENHA]@...pooler.supabase.com:5432/postgres`), com a senha do banco no lugar de `[SENHA]`. Use o pooler, não a conexão direta: o GitHub não alcança a direta (IPv6).
2. No GitHub: **Settings** > **Secrets and variables** > **Actions** > **New repository secret**:
   - `BACKUP_DB_URL`: a URL acima.
   - `BACKUP_PASSPHRASE`: uma frase longa e aleatória. **Guarde-a num gerenciador de senhas: sem ela a cópia não abre.**
3. Em **Actions** > **Cópia de segurança do banco** > **Run workflow**, rode uma vez à mão e confira que terminou em verde.

**Atenção a dois pontos:**

- O repositório é **público**, e quem tiver conta no GitHub consegue baixar os arquivos gerados pelas rotinas. A cópia sai cifrada (AES-256), e sem a frase ela é ilegível, mas ela contém nomes, e-mails e telefones de clientes. Se isso incomoda, torne o repositório privado, ou me peça para enviar a cópia para um armazenamento seu (Cloudflare R2, por exemplo).
- A cópia leva as contas e os dados da barbearia. As **fotos do catálogo** ficam no Storage e não entram nela: se se perderem, envie de novo pelo painel.

**Para restaurar** (num projeto Supabase novo, depois de rodar as migrações do guia 06):

```
gpg --decrypt onstyle-AAAA-MM-DD.dump.gpg > banco.dump
pg_restore --data-only --disable-triggers --no-owner -d "URL_DO_PROJETO_NOVO" banco.dump
```

Esse caminho de restauração **não foi ensaiado**. Faça o ensaio num projeto de teste antes de precisar dele.

## 8. Dados reais

Pelo painel, em **Configurações**: nome, endereço, telefone, WhatsApp, Instagram e horário de funcionamento. Em **Serviços** e **Produtos**: ajuste preços e descrições, e envie as fotos.

No projeto de desenvolvimento, a segunda-feira tem um horário solto (das 23h às 23h30), provavelmente de um teste. Ele aparece no site e nos dados para buscadores. Confira o horário de cada dia antes de divulgar.

## 9. Ensaio completo, antes de divulgar

1. Crie uma conta de cliente com outro e-mail, confirme pelo link e entre.
2. Agende um serviço. Confira: e-mail de confirmação, sino no painel, horário na tela "Hoje".
3. Remarque e cancele como cliente; veja os e-mails e o sino.
4. Como dono: confirme, inicie e conclua um atendimento; registre uma venda e estorne; bloqueie uma folga.
5. Abra o site no celular (4G, não só no Wi-Fi) e agende de novo.
6. Mande o endereço do site por WhatsApp: a imagem de compartilhamento deve aparecer.
7. Derrube o monitor de propósito (por exemplo, pausando o Worker) e veja se o aviso chega.

Quando tudo passar, divulgue o endereço.

## O que está provado

- A compilação roda no ambiente da Cloudflare (workerd, em máquina local): páginas, dados reais do Supabase, `/api/saude`, `/robots.txt`, `/sitemap.xml`, imagem de compartilhamento, cabeçalhos de segurança, redirecionamento de `/admin` para o login e leitura dos segredos de execução pela rota de e-mails.
- Em Chrome de verdade, as páginas públicas em 360 e 1280 pixels: sem erro no console, sem rolagem horizontal, textos de 14 pixels ou mais, alvos de toque de 44 pixels ou mais, sem achados no verificador de acessibilidade (axe, regras WCAG 2.1 AA) e sem violação da política de conteúdo.
- Nenhum segredo nos arquivos enviados ao navegador, nenhuma vulnerabilidade conhecida nas dependências de produção (`npm audit`).
- A cifra e a decifra da cópia de segurança (`gpg`), e a sintaxe da rotina.

## O que não está provado

- A publicação de verdade (precisa da sua conta) e o certificado do domínio.
- O envio real de e-mails, o agendador, o monitor e a rotina de cópia (precisam das suas contas e segredos).
- As áreas do dono e do cliente em navegador (precisam de login real): foram conferidas por testes automáticos e pelo redirecionamento, não vistas em tela.
- Desempenho medido no celular (a página é leve e estática, mas não foi medida com ferramenta).
