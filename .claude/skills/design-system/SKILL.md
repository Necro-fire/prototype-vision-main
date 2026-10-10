---
name: design-system
description: Use em qualquer trabalho de interface do ON-STYLE (tela nova, componente, cor, tipografia, textos, responsividade). Aplica os limites de legibilidade e acessibilidade e evita visual genérico.
---

# Design System

Direção revista em 10/10/2026: **Letreiro noturno, escuro, com laranja e um pouco de azul, cantos retos** (`docs/03-design-system.md`). Os tokens ficam em `src/styles.css`.

## Cores: só por token

| Para                            | Classe                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| Fundo e texto                   | `bg-background` (asfalto), `text-foreground`, `bg-card` (superfície elevada)                 |
| Texto secundário                | `text-muted-foreground`                                                                      |
| Ação principal                  | `bg-primary text-primary-foreground` (laranja com texto escuro)                              |
| Ação secundária                 | `variant="outline"` (contorno fino) ou `bg-secondary text-secondary-foreground`              |
| Links, etiqueta, foco           | `text-info`, `bg-info text-info-foreground` (azul claro), `ring` (azul claro)                |
| Borda de campo e de cartão      | campo: `border-input` (3:1 ou mais); cartão: `border-line`; `border-border` é só divisória   |
| Cabeçalho, rodapé, menu lateral | `bg-header text-header-foreground`, um degrau abaixo do fundo                                |
| Faixa azul                      | `bg-blue text-blue-foreground` (preenchimento; texto branco)                                 |
| Situações                       | `success`, `warning`, `destructive`, `neutral` e as versões `-soft`; sempre com ícone e nome |

**O azul `blue` nunca é texto sobre o escuro** (só preenchimento com texto branco); para texto use `info`. O laranja é texto permitido sobre o escuro (7,4:1), mas só para preço e destaque, nunca para parágrafo.

Tipografia: Public Sans, uma família e uma largura. `font-display` (e todo h1 a h4) usa peso 600 com as letras um pouco mais juntas; o texto fica em 400. Em títulos use `font-semibold` e `leading-tight` ou `leading-[1.05]`; nada de caixa alta nem peso extra. Algarismos tabulares já são o padrão.

Para trocar uma cor do sistema, mude o valor em `:root` de `src/styles.css`. O teste `contraste-dos-tokens` diz se ainda passa.

## Limites que valem sempre

- **Texto:** nenhum abaixo de 14px; corpo em 16px. Linhas com no máximo 75 caracteres.
- **Toque:** botões, campos e links tocáveis com pelo menos 44px de altura e largura.
- **Contraste:** 4,5:1 para texto, 3:1 para ícones e bordas de campos. Confira o par de cores antes de usar.
- **Tela:** desenhe a partir de 360px e amplie. Sem rolagem horizontal da página; tabela vira lista no celular.
- **Movimento:** só em resposta a uma ação. Respeite `prefers-reduced-motion`.
- **Teclado e leitor de tela:** foco visível, rótulo em todo campo, erro ligado ao campo (`aria-describedby`), botão de ícone com `aria-label`.

## Componentes

Use `src/components/ui/`: Button, Card, Input, Textarea, NativeSelect, **Campo** (rótulo, controle, ajuda e erro, com `aria-describedby`), Badge, IconTile, SectionTitle, EstadoCarregando, Dialog, AlertDialog (no lugar de `confirm`) e Sheet. Nota em estrelas: `Estrelas` e `ResumoDaNota`, em `features/avaliacoes/estrelas.tsx`. No painel: `ListaAdaptavel`, `Indicador`, `EstadoVazio` e `SecaoAdmin`. Se faltar um, crie com o mesmo padrão dos vizinhos em vez de montar HTML solto.

Cores e tamanhos vêm de variáveis (`var(--primary)` ou classes do Tailwind ligadas a elas), nunca valores soltos como `#f60`.

## Escrita da interface

- Frases curtas, voz ativa, maiúscula só no início da frase.
- Botão diz o que acontece: "Confirmar agendamento", não "Enviar" nem "Continuar".
- O mesmo nome do começo ao fim: quem toca "Confirmar agendamento" lê "Agendamento confirmado".
- Erro diz o que houve e como resolver, sem pedir desculpa: "Esse horário acabou de ser reservado. Escolha outro."
- Tela vazia convida a agir: o que falta e o botão para resolver.
- Forma: cantos retos, sem sombra suave, sem blur, sem pílula nem avatar redondo. Estado de ativo e destaque por régua laranja, não por brilho.
- Evite: rótulo em caixa alta acima de título, numeração 01/02/03 em lista que não é sequência, uma palavra colorida no fim do título, seta dentro de todo botão.

## Fotografias

Só reais e licenciadas, com crédito em `docs/creditos-imagens.md`, em `public/fotos/` e sempre com texto alternativo que descreva a cena. Nenhuma imagem gerada por IA. Evite pessoas reconhecíveis e marcas de terceiros legíveis.

Use o componente `Foto` (`src/components/foto.tsx`): ele reserva o espaço em 3:2 e escolhe a largura certa do arquivo. Hoje há duas fotos de banco, provisórias: em Contato e em Serviços.

Fotos de serviços e produtos não são arquivos do projeto: o dono as envia pelo painel (Storage do Supabase) e aparecem como `Miniatura` (`src/components/miniatura.tsx`) ao lado do nome, com `alt` vazio porque o nome já está escrito ao lado.

## Conferência antes de entregar

Abra a página em 360px e em 1280px. Percorra com o teclado (Tab). Confira o contraste dos pares de cor novos. Rode a Skill `verificar-entrega`.
