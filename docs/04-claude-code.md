# 04 — Estrutura para o Claude Code

Estes arquivos fazem com que cada sessão do Claude Code comece sabendo como o projeto funciona, sem você repetir as regras. Nenhum deles foi criado ainda: são a primeira entrega da Fase 0, depois da aprovação.

## O que será criado

```
CLAUDE.md                         regras do projeto, lidas em toda sessão
AGENTS.md                         passa a apontar para o CLAUDE.md
.claude/
  settings.json                   permissões de comandos do dia a dia
  skills/
    migracao-banco/SKILL.md
    nova-funcionalidade/SKILL.md
    design-system/SKILL.md
    regras-agenda/SKILL.md
    email-transacional/SKILL.md
    verificar-entrega/SKILL.md
```

## O `AGENTS.md` atual

As instruções existentes descrevem o protótipo e deixam de valer:

| Regra atual | Destino |
| --- | --- |
| Projeto conectado ao Lovable; não reescrever o histórico | Removida ao sair do Lovable |
| Manter catálogos, clientes e agendamentos no `ShopProvider` | Substituída: os dados passam a viver no banco |
| Rotas públicas independentes e painel em rota-mãe; metadados por rota | Mantida |
| Validação de agenda em função pura, com testes | Mantida e ampliada |
| Importar fotos por arquivos JSON de ponteiro | Substituída: fotos dentro do projeto |
| Nunca usar a captura de tela de referência como conteúdo | Mantida, junto com "nenhuma imagem gerada por IA" |

## Rascunho do `CLAUDE.md`

Curto de propósito: o que é regra fica aqui; o detalhe fica nas Skills e em `docs/`.

```markdown
# ON-STYLE

Sistema de agendamento e gestão de uma barbearia de bairro: um barbeiro, uma agenda.
Perfis: dono e cliente. Idioma do produto e do código de domínio: português do Brasil.

## Comandos
- `npm run dev` — desenvolvimento
- `npm run verificar` — formatação, tipos, testes e compilação; rode antes de dizer que terminou
- `npm run test:e2e` — fluxo de agendamento de ponta a ponta
- `npm run db:migrar` — aplica as migrações no banco de desenvolvimento
- `npm run db:tipos` — regenera os tipos do banco

## Arquitetura
- TanStack Start + React 19 + Tailwind 4; Supabase (Postgres, Auth, Storage, Realtime).
- `src/routes/` só carrega dados e monta a tela. A lógica mora em `src/features/<área>/`.
- Regras de negócio são funções puras com teste. O cálculo de horários livres
  fica em `src/features/agenda/disponibilidade.ts`.
- Detalhes em `docs/02-arquitetura.md`.

## Regras que não se quebram
- Toda tabela tem RLS ativa e nasce fechada. Tabela nova sem regra e sem teste de permissão não entra.
- Nunca confie na tela para proteger dados: páginas de `/admin` e `/cliente` verificam a sessão no servidor.
- A chave administrativa do Supabase nunca vai para código que roda no navegador.
- Toda função de servidor valida a entrada com Zod.
- Dinheiro em centavos inteiros. Datas como instante com fuso; exibição em `America/Sao_Paulo`.
- Migração aplicada não se edita: cria-se outra.
- Agendar é uma operação única no banco; não reimplemente a verificação de conflito na tela.

## Interface
- Use apenas os tokens de função e os componentes de `src/components/ui/`. Sem cores ou tamanhos soltos.
- Nenhum texto abaixo de 14px; alvos de toque com 44px ou mais; desenhe a partir de 360px.
- Texto de interface em frases curtas, com maiúscula só no início.
- Fotos reais e licenciadas, com crédito em `docs/creditos-imagens.md`. Nenhuma imagem gerada por IA.
- Detalhes em `docs/03-design-system.md`.

## Como trabalhar
- Siga a fase atual de `docs/05-roadmap.md`. Não adiante fases nem amplie o escopo sem combinar.
- Preserve o que já funciona: cada fase termina com tudo o que existia ainda funcionando.
- Mudança em regra de negócio vem com teste. Mudança em permissão vem com teste de permissão.
- Decisões novas de produto são do dono do projeto: pergunte antes de assumir.
- Código legível: uma instrução por linha, formatado pelo Prettier.
```

## Skills do projeto

Cada Skill é um roteiro que o Claude carrega sozinho quando a tarefa pede, ou que você chama com `/nome`.

| Skill | Quando entra | O que garante |
| --- | --- | --- |
| `migracao-banco` | Qualquer mudança de tabela, regra de acesso ou função do banco | Nome e ordem da migração; RLS na mesma migração; teste de permissão; tipos regenerados; aplicação em desenvolvimento antes de produção |
| `nova-funcionalidade` | Criar uma tela ou módulo | A forma padrão de uma pasta em `features/`: validação, função de servidor, consulta, componentes, rota com título e descrição, testes |
| `design-system` | Qualquer trabalho de interface | Tokens e componentes permitidos; limites de tamanho de texto e toque; a voz dos textos; lista de conferência em celular e computador antes de entregar |
| `regras-agenda` | Mexer em horários, bloqueios ou situações do agendamento | As regras A1 a A11 e o diagrama de situações; onde ficam as funções puras; os casos de teste que precisam continuar passando |
| `email-transacional` | Criar ou alterar um aviso por e-mail | O padrão de fila; modelo com versão em texto simples; respeito às preferências do cliente; teste de envio em desenvolvimento |
| `verificar-entrega` | Antes de encerrar qualquer tarefa | Formatação, tipos, testes, compilação, o fluxo de agendamento no navegador e um resumo honesto do que foi e do que não foi verificado |

### Skills que já existem e serão usadas

| Skill | Uso |
| --- | --- |
| `frontend-design` | Na construção da identidade e de cada tela nova |
| `code-review` | Revisão de cada fase antes de você aprovar |
| `security-review` | Obrigatória ao fim das fases de banco, contas e publicação |
| `run` | Abrir o sistema e conferir uma mudança funcionando de verdade |

## Configurações

**`.claude/settings.json`** libera sem perguntar os comandos repetitivos e seguros: `npm run dev`, `npm run verificar`, os testes e a leitura do estado do git. Continuam pedindo confirmação: instalar pacotes, aplicar migrações, enviar código ao GitHub e publicar.

**Produção fica fora do alcance do Claude.** As chaves do projeto `onstyle-prod` não ficam nesta máquina; migrações e publicações em produção passam pelo GitHub, depois da sua aprovação.

**Memória do projeto**: as decisões deste planejamento ficam em `docs/`, versionadas com o código, e não em anotações soltas. Ao mudar uma decisão, o documento correspondente é atualizado na mesma entrega.

## Rotina de cada fase

1. Você aprova o início da fase.
2. O Claude apresenta o plano da fase em tarefas pequenas.
3. Implementa em uma ramificação separada do git, com testes.
4. Roda `verificar-entrega` e, quando couber, `code-review` e `security-review`.
5. Mostra o resultado funcionando e o que mudou.
6. Você aprova, e a ramificação é incorporada.
