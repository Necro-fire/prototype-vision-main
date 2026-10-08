# 04 — Estrutura para o Claude Code

Estes arquivos fazem com que cada sessão do Claude Code comece sabendo como o projeto funciona, sem você repetir as regras. Foram criados na Fase 0.

## O que existe

```
CLAUDE.md                         regras do projeto, lidas em toda sessão
AGENTS.md                         aponta para o CLAUDE.md, para outras ferramentas
.claude/
  settings.json                   comandos liberados sem pergunta
  skills/
    verificar-entrega/SKILL.md
    regras-agenda/SKILL.md
    nova-funcionalidade/SKILL.md
    design-system/SKILL.md
.github/workflows/verificar.yml   roda `npm run verificar` a cada envio
```

O `CLAUDE.md` é curto de propósito: o que é regra fica nele; o detalhe fica nas Skills e em `docs/`. Leia o arquivo em [CLAUDE.md](../CLAUDE.md).

## O `AGENTS.md` antigo

As instruções do protótipo foram substituídas:

| Regra antiga                                                     | Destino                                                                                   |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Projeto conectado ao Lovable; não reescrever o histórico         | Removida: o projeto saiu do Lovable. A regra de não reescrever histórico já enviado segue |
| Manter catálogos, clientes e agendamentos no `ShopProvider`      | Substituída: o `ShopProvider` é provisório e sai com o banco                              |
| Rotas públicas independentes e painel em rota-mãe; metadados     | Mantida, no `CLAUDE.md` e na Skill `nova-funcionalidade`                                  |
| Validação de agenda em função pura, com testes                   | Mantida e ampliada, na Skill `regras-agenda`                                              |
| Importar fotos por arquivos JSON de ponteiro                     | Substituída: fotos em `public/fotos` e créditos em `docs/creditos-imagens.md`             |
| Nunca usar a captura de tela de referência como conteúdo do site | Mantida, junto com "nenhuma imagem gerada por IA"                                         |

## Skills do projeto

Cada Skill é um roteiro que o Claude carrega sozinho quando a tarefa pede, ou que você chama com `/nome`.

| Skill                 | Quando entra                                             | O que garante                                                                                              |
| --------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `verificar-entrega`   | Antes de encerrar qualquer tarefa                        | Verificação completa, conferência no navegador, e um relato honesto do que foi e do que não foi verificado |
| `regras-agenda`       | Mexer em horários, bloqueios ou situações do agendamento | As regras vigentes e planejadas, onde ficam as funções puras, como testar os limites                       |
| `nova-funcionalidade` | Criar uma tela ou módulo                                 | Onde cada parte fica, rotas com título e descrição, testes                                                 |
| `design-system`       | Qualquer trabalho de interface                           | Limites de texto, toque e contraste; voz dos textos; regras das fotos                                      |

### Skills que entram com a infraestrutura

Criar agora descreveria comandos que ainda não existem.

| Skill                | Entra na | O que garante                                                                                                             |
| -------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `migracao-banco`     | Fase 2   | Nome e ordem da migração; RLS na mesma migração; teste de permissão; tipos regenerados; desenvolvimento antes de produção |
| `email-transacional` | Fase 4   | Padrão de fila; modelo com versão em texto simples; respeito às preferências do cliente; teste de envio                   |

A Skill `design-system` é atualizada na Fase 1, quando a direção visual for fechada.

### Skills que já existem no Claude Code e serão usadas

| Skill             | Uso                                                           |
| ----------------- | ------------------------------------------------------------- |
| `frontend-design` | Na construção da identidade e de cada tela nova               |
| `code-review`     | Revisão de cada fase antes de você aprovar                    |
| `security-review` | Obrigatória ao fim das fases de banco, contas e publicação    |
| `run`             | Abrir o sistema e conferir uma mudança funcionando de verdade |

## Configurações

**`.claude/settings.json`** libera sem perguntar os comandos repetitivos e seguros: `npm run dev`, `verificar`, `lint`, `typecheck`, `format`, `test`, `build` e a leitura do estado do git. Continuam pedindo confirmação: instalar pacotes, enviar código ao GitHub, aplicar migrações e publicar.

**Produção fica fora do alcance do Claude.** As chaves do projeto `onstyle-prod` não ficam nesta máquina; migrações e publicações em produção passam pelo GitHub, depois da sua aprovação.

**Memória do projeto:** as decisões do planejamento ficam em `docs/`, versionadas com o código. Ao mudar uma decisão, o documento correspondente é atualizado na mesma entrega.

## Rotina de cada fase

1. Você aprova o início da fase.
2. O Claude apresenta o plano da fase em tarefas pequenas.
3. Implementa em uma ramificação separada do git, com testes.
4. Roda `verificar-entrega` e, quando couber, `code-review` e `security-review`.
5. Mostra o resultado funcionando e o que mudou.
6. Você aprova, e a ramificação é incorporada.
