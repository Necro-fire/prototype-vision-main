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

Gerenciador de pacotes: npm (não há Bun nesta máquina). Não reintroduza `bun.lock`.

## Arquitetura

- TanStack Start + React 19 + Tailwind 4, publicado na Cloudflare (build em `.output/`).
- `src/routes/`: só páginas. Carregam dados, definem título e descrição e montam a tela.
- `src/features/<área>/`: regras de negócio, tipos e componentes de cada área (agenda, catalogo, clientes, vendas, financeiro, conta, admin).
- `src/features/demo/shop-provider.tsx`: estado provisório em memória. É a única fonte de dados hoje e **sai** quando o banco entrar (Fases 2 e 3). Não construa nada novo apoiado nele sem avisar.
- `src/lib/`: utilidades sem regra de negócio (dinheiro, telefone, erros).
- `src/components/ui/`: componentes base (shadcn). Muitos não são usados; a limpeza é da Fase 1.
- Detalhes em `docs/02-arquitetura.md`.

## Regras que não se quebram

- **Regras de negócio são funções puras com teste.** O cálculo de horários livres vive em `src/features/agenda/disponibilidade.ts` e seus testes (`*.test.ts` ao lado) precisam continuar passando.
- **Preservar o que funciona.** Cada fase termina com tudo o que existia ainda funcionando. A lista está em `docs/01-diagnostico.md`.
- **Nunca confie na tela para proteger dados.** Quando houver login, páginas de `/admin` e `/cliente` verificam a sessão no servidor e toda tabela do banco nasce com RLS ativa e fechada.
- **Nunca coloque chaves ou senhas no código.** Segredos vão em `.env` (ignorado pelo git); `.env.example` lista os nomes. Variáveis `VITE_*` vão para o navegador: só o que pode ser público.
- **Dinheiro em centavos inteiros e datas como instante com fuso**, com exibição em `America/Sao_Paulo`, nas áreas novas. O código antigo ainda usa decimais e texto; não copie esse padrão.
- **Fotos reais e licenciadas**, com crédito em `docs/creditos-imagens.md`. Nenhuma imagem gerada por IA. A captura de tela de referência nunca é conteúdo do site.
- **Toda rota de conteúdo define o próprio título e descrição** (`head`).

## Interface

Enquanto a identidade da Fase 1 não for fechada, não invente estilos novos: reaproveite o que existe. Em qualquer tela nova:

- Nenhum texto abaixo de 14px; alvos de toque com 44px ou mais; desenhe a partir de 360px de largura.
- Contraste mínimo de 4,5:1 em texto.
- Textos curtos, em sentença com maiúscula só no início. Sem rótulos em caixa alta sobre títulos.
- Detalhes em `docs/03-design-system.md`.

## Como trabalhar

- Trabalhe na ramificação da fase atual (`fase-N-...`), nunca direto na `main`. Não reescreva histórico já enviado.
- Commits em português, descrevendo o que mudou e por quê.
- Mudança de regra de negócio vem com teste. Refatoração pura vem com prova de que nada mudou (testes de tela ou comparação do HTML).
- Decisões de produto são do dono do projeto: pergunte antes de assumir.
- Não avance para fases seguintes nem amplie o escopo sem combinar.
- Código legível: uma instrução por linha, formatado pelo Prettier (`printWidth` 100). Não reintroduza linhas compactadas.
- Nomes de pastas e arquivos de domínio em português; identificadores de código seguem o arquivo vizinho (hoje, em inglês).

## Ainda não existe

Banco, login real, e-mails, testes de ponta a ponta e `npm run db:*`. Entram nas Fases 2 a 4. As Skills `migracao-banco` e `email-transacional` são criadas junto com eles.
