---
name: verificar-entrega
description: Use antes de encerrar qualquer tarefa de código do ON-STYLE, ou quando o usuário pedir para conferir, validar ou fechar uma entrega. Roda a verificação completa e relata com honestidade o que foi e o que não foi verificado.
---

# Verificar entrega

Não diga que algo está pronto antes de seguir estes passos.

## 1. Rodar

```
npm run verificar
```

Executa, em ordem: formatação (Prettier), ESLint, tipos, testes e compilação. Se algo falhar, corrija a causa. Não desative regra, não apague teste e não use `any` para passar.

Se a formatação falhar, `npm run format` resolve.

## 2. Ver funcionando

Testes e compilação não provam que a tela funciona. Para mudança visível:

1. `npm run dev` e abra a página alterada em http://localhost:8080.
2. Percorra o fluxo que mudou, não só a página inicial: agendar um horário, entrar no painel (acesso demonstrativo), mudar a situação de um agendamento.
3. Confira em largura de celular (360px) e de computador (1280px).
4. Confirme que a página mostra título correto e que o console do navegador não tem erro.

Se não puder abrir o navegador, diga isso na resposta em vez de afirmar que funciona.

## 3. Conferir o que não pode piorar

- Os testes de regras (`src/features/agenda`, `src/features/financeiro`) continuam passando.
- Nada novo abaixo de 14px de texto nem de 44px de alvo de toque.
- Nenhuma chave, senha ou `.env` em arquivo versionado: `git diff --staged` e procure.
- Foto nova tem crédito em `docs/creditos-imagens.md`.

## 4. Relatar

Termine com:

- **Verificado:** o que rodou e passou (cite números: quantos testes).
- **Não verificado:** o que ficou de fora e por quê.
- **Pendências:** decisões que dependem do dono do projeto.

Não escreva "tudo funcionando" se algum item acima ficou sem conferir.
