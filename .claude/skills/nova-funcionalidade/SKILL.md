---
name: nova-funcionalidade
description: Use ao criar uma tela, módulo ou funcionalidade nova no ON-STYLE (nova página, novo módulo do painel, nova regra de negócio). Define onde cada parte fica e como se organiza uma área em src/features.
---

# Nova funcionalidade

## Antes de escrever

1. Confira em `docs/05-roadmap.md` se a funcionalidade pertence à fase atual. Se for de fase futura, pergunte antes.
2. Confira em `docs/02-arquitetura.md` as regras de negócio e permissões que se aplicam.
3. Se houver decisão de produto em aberto (texto, regra, quem pode ver), pergunte. Não assuma.

## Onde cada coisa fica

| O quê                            | Onde                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------- |
| Página (rota)                    | `src/routes/<nome>.tsx`. Só carrega dados, define `head` e monta a tela      |
| Regra de negócio                 | `src/features/<área>/<regra>.ts`, função pura, com `<regra>.test.ts` ao lado |
| Tipos da área                    | `src/features/<área>/tipos.ts`                                               |
| Componentes da área              | `src/features/<área>/<componente>.tsx`                                       |
| Utilidade sem regra de negócio   | `src/lib/`                                                                   |
| Componente genérico de interface | `src/components/ui/`                                                         |

Áreas existentes: `agenda`, `catalogo`, `clientes`, `vendas`, `financeiro`, `conta`, `admin`. Área nova precisa de motivo.

## Rotas

- Uma rota por arquivo, no padrão de arquivos do TanStack Start (veja `src/routes/README.md`).
- Rota de conteúdo define `head` com `title`, `description` e as metas `og:` e `twitter:`, em português e com o nome da barbearia.
- O `src/routeTree.gen.ts` é gerado a cada `dev` e `build`: não edite à mão.
- Módulo novo do painel: um arquivo em `src/features/admin/`, o nome em `modulos.ts` e o caso em `painel.tsx`. Use `PaginaAdmin` como casca.

## Estado e dados

Os dados vêm do Supabase. Páginas públicas carregam no `loader` da rota (já na renderização do servidor) e passam para a tela; áreas com login leem com React Query pelo módulo `*-do-dono.ts` da área. Gravação sensível chama função do banco (skill `migracao-banco`), com o erro traduzido por `mensagemDoBanco`. Não existe mais estado em memória.

## Testes

- Regra de negócio: teste de unidade ao lado do arquivo.
- Tela com comportamento (filtro, mudança de situação, formulário): teste de tela com Testing Library, no modelo de `src/features/admin/painel.test.tsx`.
- Mudança de visual puro: sem teste novo, mas siga a Skill `verificar-entrega`.

## Fechando

Rode a Skill `verificar-entrega`.
