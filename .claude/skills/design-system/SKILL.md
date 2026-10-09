---
name: design-system
description: Use em qualquer trabalho de interface do ON-STYLE (tela nova, componente, cor, tipografia, textos, responsividade). Aplica os limites de legibilidade e acessibilidade e evita visual genérico.
---

# Design System

Direção fechada na Fase 1: **Letreiro, em laranja, preto e um pouco de azul** (`docs/03-design-system.md`). Os tokens ficam em `src/styles.css`.

## Cores: só por token

| Para                                     | Classe                                                                                       |
| ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| Fundo e texto                            | `bg-background`, `text-foreground`, `bg-card`                                                |
| Texto secundário                         | `text-muted-foreground`                                                                      |
| Ação principal                           | `bg-primary text-primary-foreground` (laranja com texto preto)                               |
| Ação forte ou secundária                 | `bg-secondary text-secondary-foreground` (preto com texto branco)                            |
| Links, etiqueta, foco                    | `text-info`, `bg-info text-info-foreground`, `ring` (o azul, só em pequenos pontos)          |
| Borda de campo                           | `border-input` (3:1 ou mais). `border-border` é só divisória decorativa                      |
| Faixas escuras (cabeçalho, rodapé, menu) | `bg-header text-header-foreground` e a classe `on-dark` no contêiner, que clareia o foco     |
| Situações                                | `success`, `warning`, `destructive`, `neutral` e as versões `-soft`; sempre com ícone e nome |

**O laranja nunca é texto sobre fundo claro** (2,6:1). Para destaque em texto, use o preto em negrito ou o azul.

Tipografia: `font-display` (Bricolage Grotesque) nos títulos e o padrão (Figtree) no resto. Em títulos use `font-extrabold` e `leading-tight`.

Para trocar uma cor do sistema, mude o valor em `:root` de `src/styles.css`. O teste `contraste-dos-tokens` diz se ainda passa.

## Limites que valem sempre

- **Texto:** nenhum abaixo de 14px; corpo em 16px. Linhas com no máximo 75 caracteres.
- **Toque:** botões, campos e links tocáveis com pelo menos 44px de altura e largura.
- **Contraste:** 4,5:1 para texto, 3:1 para ícones e bordas de campos. Confira o par de cores antes de usar.
- **Tela:** desenhe a partir de 360px e amplie. Sem rolagem horizontal da página; tabela vira lista no celular.
- **Movimento:** só em resposta a uma ação. Respeite `prefers-reduced-motion`.
- **Teclado e leitor de tela:** foco visível, rótulo em todo campo, erro ligado ao campo (`aria-describedby`), botão de ícone com `aria-label`.

## Componentes

Use `src/components/ui/`: Button, Input, Textarea, NativeSelect, **Campo** (rótulo, controle, ajuda e erro, com `aria-describedby`), Badge, Dialog, AlertDialog (no lugar de `confirm`) e Sheet. No painel: `ListaAdaptavel`, `Indicador`, `EstadoVazio` e `SecaoAdmin`. Se faltar um, crie com o mesmo padrão dos vizinhos em vez de montar HTML solto.

Cores e tamanhos vêm de variáveis (`var(--primary)` ou classes do Tailwind ligadas a elas), nunca valores soltos como `#f60`.

## Escrita da interface

- Frases curtas, voz ativa, maiúscula só no início da frase.
- Botão diz o que acontece: "Confirmar agendamento", não "Enviar" nem "Continuar".
- O mesmo nome do começo ao fim: quem toca "Confirmar agendamento" lê "Agendamento confirmado".
- Erro diz o que houve e como resolver, sem pedir desculpa: "Esse horário acabou de ser reservado. Escolha outro."
- Tela vazia convida a agir: o que falta e o botão para resolver.
- Evite: rótulo em caixa alta acima de título, numeração 01/02/03 em lista que não é sequência, uma palavra colorida no fim do título, seta dentro de todo botão.

## Fotografias

Só reais e licenciadas, com crédito em `docs/creditos-imagens.md`, em `public/fotos/` e sempre com texto alternativo que descreva a cena. Nenhuma imagem gerada por IA. Evite pessoas reconhecíveis e marcas de terceiros legíveis.

Use o componente `Foto` (`src/components/foto.tsx`): ele reserva o espaço em 3:2 e escolhe a largura certa do arquivo. Hoje há duas fotos de banco, provisórias: em Contato e em Serviços.

## Conferência antes de entregar

Abra a página em 360px e em 1280px. Percorra com o teclado (Tab). Confira o contraste dos pares de cor novos. Rode a Skill `verificar-entrega`.
