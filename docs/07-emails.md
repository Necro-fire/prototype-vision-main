# E-mails ao cliente

O cliente recebe quatro e-mails sobre o horário dele:

| E-mail       | Quando sai                                                             |
| ------------ | ---------------------------------------------------------------------- |
| Confirmação  | Logo depois de agendar                                                 |
| Lembrete     | Às 18h da véspera, no fuso da barbearia (não sai se ele marcou depois) |
| Remarcação   | Quando o horário muda, pelo cliente ou pelo dono                       |
| Cancelamento | Quando o horário é cancelado, pelo cliente ou pelo dono                |

O cliente desliga o lembrete em "Meu perfil". Os outros três são sempre enviados. Se o horário muda ou é cancelado antes do lembrete sair, o lembrete antigo é descartado.

E-mails de conta (confirmar o cadastro, recuperar a senha) não passam por aqui: quem envia é o Supabase Auth.

## Como funciona

1. **O banco enche a fila.** Um gatilho em `agendamentos` grava uma linha em `emails_fila` no mesmo instante em que o agendamento muda. O texto do e-mail leva tudo de que precisa em `dados`, já com o horário em UTC e o fuso da barbearia.
2. **O agendador chama o servidor.** A cada poucos minutos, algo faz `POST /api/emails/processar` com `Authorization: Bearer <CRON_SECRET>`.
3. **O servidor esvazia a fila.** Pede ao banco os e-mails que já podem sair (`emails_reservar`), monta o texto (`src/features/emails/modelos.ts`), envia pelo Resend e registra o resultado (`email_enviado` ou `email_falhou`).
4. **Se falhar, tenta de novo.** Depois de 5 minutos, 30 minutos, 2 horas e 6 horas. Na quinta falha o banco desiste e acende o sino do dono ("E-mail não enviado"). Em Alertas, o dono vê qual e-mail, para quem e o motivo, e toca em "Tentar de novo".

Dois envios ao mesmo tempo nunca pegam o mesmo e-mail (a reserva é feita no banco, com empréstimo de 10 minutos), e o Resend recebe o id do e-mail como chave de idempotência, então uma nova tentativa não manda o mesmo e-mail duas vezes.

O servidor fala com o banco só pelas três funções acima, com a chave `service_role`. Ele não lê nem grava nenhuma tabela.

## O que você precisa fazer

1. **Rodar a migração** `supabase/migrations/20261009000002_emails.sql` no SQL Editor do Supabase (depois da `20261009000001`).
2. **Criar a conta no Resend** (resend.com, plano gratuito) e uma chave em API Keys.
3. **Preencher o `.env`** (os nomes estão em `.env.example`; os valores ficam só aí):
   - `SUPABASE_SERVICE_ROLE_KEY`: Project Settings > API > `service_role`. Dá acesso total ao banco. Não cole no chat nem no código.
   - `RESEND_API_KEY`: a chave criada no passo 2.
   - `EMAIL_REMETENTE`: por exemplo `ON-STYLE <onboarding@resend.dev>`.
   - `VITE_SITE_URL`: `http://localhost:8080` em desenvolvimento (é público, por isso leva o prefixo).
   - `CRON_SECRET`: uma senha longa e aleatória, inventada por você.
4. **Reiniciar `npm run dev`**: o servidor só lê o `.env` ao iniciar.

### Antes de ter um domínio

Sem domínio verificado, o Resend só deixa enviar de `onboarding@resend.dev` e **somente para o e-mail da sua própria conta Resend**. Para testar, crie uma conta de cliente com esse e-mail. Para enviar a qualquer cliente, verifique o domínio da barbearia em Resend > Domains (isso faz parte da Fase 5) e troque `EMAIL_REMETENTE`.

## Testar à mão

Com o servidor rodando, agende um horário pela conta de cliente e depois, no terminal:

```
curl -X POST http://localhost:8080/api/emails/processar -H "Authorization: Bearer SEU_CRON_SECRET"
```

A resposta traz `reservados`, `enviados` e `falhas`. Se algo faltar no `.env`, ela diz o **nome** da variável (nunca o valor). Para ver a fila: `select modelo, destinatario, enviado_em, tentativas, erro from emails_fila order by criado_em desc;`

## Agendador em produção

Na publicação (Fase 5) o site tem endereço público, e o agendador pode ser o próprio Supabase (`pg_cron` com `pg_net`, em Database > Extensions):

```sql
select cron.schedule(
  'enviar-emails',
  '*/5 * * * *',
  $$ select net.http_post(
       url := 'https://SEU-SITE/api/emails/processar',
       headers := jsonb_build_object('Authorization', 'Bearer SEU_CRON_SECRET')
     ) $$
);
```

Guarde o segredo no Vault do Supabase em vez de escrevê-lo na consulta. No Cloudflare, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_REMETENTE` e `CRON_SECRET` entram como segredos do Worker, não como variáveis `VITE_*`. Detalhes em `docs/08-publicacao.md`.

## O que está provado e o que não está

- **Provado por teste:** o que entra na fila em cada mudança (no Postgres de teste), a hora do lembrete, o descarte do lembrete velho, o respeito à preferência do cliente, as tentativas, o aviso ao dono, quem pode chamar o quê, o texto de cada e-mail e seu fuso, o envio ao Resend (com `fetch` simulado) e a proteção da rota por segredo.
- **Não provado:** um envio de verdade pelo Resend, o agendador real e o `pg_cron`. Dependem da sua conta e do site publicado.
