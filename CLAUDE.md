# ON-STYLE

Sistema de agendamento e gestão de uma barbearia de bairro: um barbeiro, uma agenda.
Perfis: dono e cliente. Textos de interface em português do Brasil.

O planejamento completo está em `docs/` (diagnóstico, arquitetura, design system e roadmap).
A fase atual e o que cada fase entrega estão em `docs/05-roadmap.md`.

## Comandos

- `npm run dev`: servidor de desenvolvimento em http://localhost:8080
- `npm run verificar`: formatação, ESLint, tipos, testes e compilação. Rode antes de dizer que terminou.
- `npm test`: só os testes. `npm run test:watch` para acompanhar.
- `npm run format`: aplica o Prettier.
- `npx vitest run supabase`: só os testes do banco (Postgres em memória, sem conta nem Docker).

Gerenciador de pacotes: npm (não há Bun nesta máquina). Não reintroduza `bun.lock`.

## Arquitetura

- TanStack Start + React 19 + Tailwind 4, publicado na Cloudflare (build em `.output/`).
- `src/routes/`: só páginas. Carregam dados, definem título e descrição e montam a tela.
- `src/features/<área>/`: regras de negócio, tipos e componentes de cada área (agenda, catalogo, clientes, vendas, financeiro, conta, admin).
- Dados e sessão: `src/lib/supabase.ts` (visitante), `src/lib/supabase-navegador.ts` (sessão no cookie) e `src/lib/server/supabase.ts` (servidor, nunca vai para o navegador). Cada área tem um módulo `banco.ts` ou `*-do-dono.ts` que lê e grava, e as telas usam esses módulos (leituras com React Query, gravações por função do banco). Não existe mais estado em memória.
- `src/lib/`: utilidades sem regra de negócio (dinheiro, telefone, datas, contraste).
- `supabase/`: migrações, seed e testes do banco. O banco é a barreira de segurança: regras de acesso e de reserva vivem lá (`docs/06-supabase.md`).
- `src/components/ui/`: componentes base do Design System (Button, Input, Campo, NativeSelect, Dialog...). Só ficam os que têm uso.
- Detalhes em `docs/02-arquitetura.md`.

## Regras que não se quebram

- **Regras de negócio são funções puras com teste.** O cálculo de horários livres vive em `src/features/agenda/horarios-livres.ts`, e `supabase/testes/paridade.test.ts` prova que ele concorda com o banco; a regra de situação do agendamento (`admin/situacoes.ts`) tem a mesma prova em `supabase/testes/situacoes.test.ts`. Esses testes precisam continuar passando.
- **Preservar o que funciona.** Cada fase termina com tudo o que existia ainda funcionando. A lista está em `docs/01-diagnostico.md`.
- **Nunca confie na tela para proteger dados.** Toda tabela do banco nasce com RLS ativa e fechada, e agendamento e venda só mudam por função do banco. `/admin` e `/cliente` verificam a sessão no servidor antes de renderizar (`obterSessao`). Mudou o banco? Skill `migracao-banco`.
- **Nunca coloque chaves ou senhas no código.** Segredos vão em `.env` (ignorado pelo git); `.env.example` lista os nomes. Variáveis `VITE_*` vão para o navegador: só o que pode ser público.
- **Dinheiro em centavos inteiros e datas como instante com fuso**, com exibição em `America/Sao_Paulo`. Preço digitado vira centavos por `reaisParaCentavos`; nada de ponto flutuante.
- **Fotos reais e licenciadas**, com crédito em `docs/creditos-imagens.md`. Nenhuma imagem gerada por IA. Não adicione nenhuma sem a licença registrada: o teste `creditos-das-fotos` acusa.
- **Toda rota de conteúdo define o próprio título e descrição** (`head`).

## Interface

Design System "Letreiro" (laranja, preto e um pouco de azul): tokens em `src/styles.css`, componentes em `src/components/ui/`. Detalhes em `docs/03-design-system.md` e na Skill `design-system`.

- Use só os tokens (`bg-primary`, `text-muted-foreground`...) e os componentes existentes. Sem cor ou tamanho solto.
- O laranja (`primary`) é sempre fundo com texto preto. Nunca texto laranja sobre claro.
- Nenhum texto abaixo de 14px; alvos de toque com 44px ou mais; desenhe a partir de 360px de largura.
- Textos curtos, em sentença com maiúscula só no início. Sem rótulos em caixa alta sobre títulos.
- Estas regras estão travadas em teste (`npm run verificar`); se o teste reclamar, corrija a tela, não o teste.

## Como trabalhar

- Trabalhe na ramificação da fase atual (`fase-N-...`), nunca direto na `main`. Não reescreva histórico já enviado.
- Commits em português, descrevendo o que mudou e por quê.
- Mudança de regra de negócio vem com teste. Refatoração pura vem com prova de que nada mudou (testes de tela ou comparação do HTML).
- Decisões de produto são do dono do projeto: pergunte antes de assumir.
- Não avance para fases seguintes nem amplie o escopo sem combinar.
- Código legível: uma instrução por linha, formatado pelo Prettier (`printWidth` 100). Não reintroduza linhas compactadas.
- Nomes de pastas e arquivos de domínio em português; identificadores de código seguem o arquivo vizinho (hoje, em inglês).

## Ainda não existe

Falta o envio de e-mails (conta Resend do dono): a fila `emails_fila` existe no banco, mas nada a processa ainda, e a Skill `email-transacional` e os testes de ponta a ponta com conta real entram quando houver essa conta e um navegador de teste. Foto de serviço e de produto (Storage do Supabase), cupons, caixa e fidelidade ficam para as Fases 6 e 7.
