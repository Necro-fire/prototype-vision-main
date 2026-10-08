# ON-STYLE

Sistema de agendamento e gestão de uma barbearia de bairro: site público para o cliente marcar horário e painel para o dono cuidar do dia.

**Situação:** protótipo em evolução. Hoje os dados vivem na memória do navegador e somem ao recarregar a página. O caminho até um sistema real está em [docs/05-roadmap.md](docs/05-roadmap.md); a fase atual é a Fase 0 (fundação).

## Como rodar

Pré-requisito: Node.js 24 e npm.

```sh
npm install
npm run dev
```

Abra http://localhost:8080. O painel fica em `/admin`; o acesso demonstrativo aparece na própria tela de entrada.

## Comandos

| Comando             | O que faz                                                                             |
| ------------------- | ------------------------------------------------------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento                                                           |
| `npm run verificar` | Formatação, ESLint, tipos, testes e compilação. Rode antes de enviar qualquer mudança |
| `npm test`          | Só os testes                                                                          |
| `npm run format`    | Aplica o Prettier                                                                     |
| `npm run build`     | Compila para publicação (saída em `.output/`)                                         |

## Tecnologia

TanStack Start, React 19, Tailwind 4 e shadcn/ui, publicado na Cloudflare. Banco e login (Supabase) entram na Fase 2.

## Estrutura

```
src/
  routes/       páginas
  features/     regras e telas por área (agenda, catalogo, admin, ...)
  components/   componentes de interface
  lib/          utilidades
public/fotos/   fotografias do site
docs/           planejamento
.claude/        instruções e Skills do Claude Code
```

## Documentação

- [Planejamento completo](docs/README.md): diagnóstico, arquitetura, identidade, roadmap
- [CLAUDE.md](CLAUDE.md): regras do projeto para o Claude Code
- [Créditos das imagens](docs/creditos-imagens.md)
