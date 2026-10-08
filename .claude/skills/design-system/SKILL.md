---
name: design-system
description: Use em qualquer trabalho de interface do ON-STYLE (tela nova, componente, cor, tipografia, textos, responsividade). Aplica os limites de legibilidade e acessibilidade e evita visual genérico.
---

# Design System

A direção visual será escolhida e fechada na Fase 1 (`docs/03-design-system.md`, três propostas: Letreiro, Azulejo e Poste). Depois disso, esta Skill é atualizada com os tokens e componentes da direção escolhida.

## Enquanto a direção não está fechada

- Não invente estilos novos nem adicione cores. Reaproveite as classes e variáveis de `src/styles.css`.
- Não aprofunde o visual atual (fundo escuro, laranja, títulos em caixa alta): ele será substituído.
- Se a tarefa exige visual novo, pare e pergunte se a Fase 1 já começou.

## Limites que valem sempre

- **Texto:** nenhum abaixo de 14px; corpo em 16px. Linhas com no máximo 75 caracteres.
- **Toque:** botões, campos e links tocáveis com pelo menos 44px de altura e largura.
- **Contraste:** 4,5:1 para texto, 3:1 para ícones e bordas de campos. Confira o par de cores antes de usar.
- **Tela:** desenhe a partir de 360px e amplie. Sem rolagem horizontal da página; tabela vira lista no celular.
- **Movimento:** só em resposta a uma ação. Respeite `prefers-reduced-motion`.
- **Teclado e leitor de tela:** foco visível, rótulo em todo campo, erro ligado ao campo (`aria-describedby`), botão de ícone com `aria-label`.

## Componentes

Use `src/components/ui/` (Button, Input, Dialog...). Se faltar um, crie lá, com o mesmo padrão dos vizinhos, em vez de montar HTML solto com classes soltas. Não use `window.confirm`: use o diálogo.

Cores e tamanhos vêm de variáveis (`var(--primary)` ou classes do Tailwind ligadas a elas), nunca valores soltos como `#f60`.

## Escrita da interface

- Frases curtas, voz ativa, maiúscula só no início da frase.
- Botão diz o que acontece: "Confirmar agendamento", não "Enviar" nem "Continuar".
- O mesmo nome do começo ao fim: quem toca "Confirmar agendamento" lê "Agendamento confirmado".
- Erro diz o que houve e como resolver, sem pedir desculpa: "Esse horário acabou de ser reservado. Escolha outro."
- Tela vazia convida a agir: o que falta e o botão para resolver.
- Evite: rótulo em caixa alta acima de título, numeração 01/02/03 em lista que não é sequência, uma palavra colorida no fim do título, seta dentro de todo botão.

## Fotografias

Reais e licenciadas, com crédito em `docs/creditos-imagens.md`. Nenhuma imagem gerada por IA. Arquivos em `public/fotos/`, referenciados por `src/assets/fotos.ts`. Sempre com texto alternativo que descreva a cena.

## Conferência antes de entregar

Abra a página em 360px e em 1280px. Percorra com o teclado (Tab). Confira o contraste dos pares de cor novos. Rode a Skill `verificar-entrega`.
