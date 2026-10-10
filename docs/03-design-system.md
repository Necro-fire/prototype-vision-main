# 03 — Identidade e Design System

## De onde parte o desenho

|                        |                                                                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **O que é**            | ON-STYLE, barbearia de bairro com um barbeiro e clientela fiel                                                                          |
| **Quem usa**           | Moradores da região, quase sempre pelo celular, muitas vezes na rua; e o próprio barbeiro, com o telefone na mão entre um corte e outro |
| **Trabalho do site**   | Mostrar o preço e marcar um horário em menos de um minuto                                                                               |
| **Trabalho do painel** | Responder "quem é o próximo?" sem precisar procurar                                                                                     |

O protótipo veste a barbearia com o uniforme de todo site do ramo: fundo quase preto, um laranja, títulos condensados em caixa alta, frases de efeito ("Reserve sua cadeira", "Qual é o seu ritual?"). Isso comunica uma barbearia cara e distante. Uma barbearia de bairro é o contrário: clara, direta, com o preço na parede e o cliente chamado pelo nome.

As três direções abaixo saem do mundo real de uma barbearia de bairro brasileira: a placa pintada à mão, o azulejo da parede e o poste listrado da porta.

## O elemento em comum: o "ON"

O nome traz um interruptor. Em qualquer direção escolhida, o "ON" da marca mostra se a barbearia está aberta naquele momento:

- Aberta: o "ON" aparece aceso, com a frase "Aberto agora, até as 19h".
- Fechada: o "ON" aparece apagado, com "Fechado. Abre amanhã às 9h".

É a informação mais útil para quem mora perto, vem direto do nome e não existe em nenhum modelo pronto. É a única ousadia da identidade; todo o resto fica discreto ao redor dela.

## Revisão de 10 de outubro de 2026: Letreiro noturno

Pedido do dono: tema escuro, laranja e um pouco de azul, **sem visual arredondado e genérico**. A direção "Letreiro" (a placa e a tabela de preços na parede) volta, agora à noite, e chegou a ganhar uma faixa diagonal laranja e azul do poste de barbeiro, retirada no mesmo dia (ver "Grafismo").

| Papel                 | Token                               | Valor         | Observação                                                              |
| --------------------- | ----------------------------------- | ------------- | ----------------------------------------------------------------------- |
| Fundo                 | `background`                        | `#0D0F12`     | Asfalto                                                                 |
| Superfície elevada    | `card`                              | `#14171C`     | Tabelas, cartões, diálogos                                              |
| Superfície funda      | `muted`                             | `#1B2027`     | Cabeçalho de tabela, rodapé de cartão                                   |
| Texto                 | `foreground`                        | `#ECEEF1`     | 16,5:1 sobre o fundo                                                    |
| Texto secundário      | `muted-foreground`                  | `#9BA4B0`     | 7,6:1 sobre o fundo                                                     |
| Ação                  | `primary`                           | `#FF7A1A`     | Fundo com texto `#0D0F12` (7,4:1). Também serve de texto sobre o escuro |
| Azul de preenchimento | `blue`                              | `#2D52D9`     | Faixa com texto branco (5,4:1). **Não** serve de texto sobre o escuro   |
| Azul de texto         | `info`, `ring`                      | `#8FA8FF`     | Links, etiquetas e foco: 8,4:1 sobre o fundo                            |
| Contorno              | `line`                              | `#3A424E`     | Cartões e tabelas; o campo usa `input` (`#7D8795`, 5,3:1)               |
| Menu lateral e rodapé | `header`                            | `#090B0D`     | Um degrau abaixo do fundo                                               |
| Situações             | `success`, `warning`, `destructive` | ver o arquivo | Versões claras sobre fundos `-soft` escuros; sempre cor e ícone         |

**Forma:** raios de 1 a 4px, sem sombra suave, sem blur, sem pílula, sem avatar redondo. A hierarquia vem de filete e de degrau de superfície. O cartão em destaque ganha uma régua laranja de 2px no alto.

**Fonte:** Public Sans, uma família e uma largura para o sistema inteiro, de desenho sóbrio e sem ornamento, para passar responsabilidade. Títulos em peso 600 e texto em 400, separados por tamanho; sem caixa alta e sem peso extra. Algarismos tabulares em todo o sistema.

**Grafismo:** nenhum. A faixa diagonal do poste (`FaixaPoste`) foi retirada em 10 de outubro de 2026: no topo do site parecia fita de obra, e o sistema já tem estrutura suficiente (filete, régua laranja do `SectionTitle`, degrau de superfície). Decoração nova só com decisão do dono.

**Página inicial (modelo de 10 de outubro de 2026):** abertura com a frase à esquerda sobre a foto da barbearia; por cima da base da abertura sobe o painel "Agende seu horário", em três colunas (serviço, dia e horário, resumo) com os passos numerados no alto e "Revisar agendamento" levando a `/agendamento` com serviço e horário já escolhidos; depois a faixa azul com quatro fatos e o rodapé em cinco colunas (marca, navegação, serviços, contato, horário). Preço, horário, endereço e nota vêm do banco.

**Componentes:** Card, IconTile, SectionTitle (régua laranja e título), EstadoCarregando e ResumoDaNota.

**O que não entrou, por seria inventado:** logos de imprensa, número de clientes fixo, avatares, "20% off" e vídeo. No lugar, dados que o banco já tem: horário, pagamento, cartão fidelidade, endereço, nota e avaliações publicadas.

## Decisão

**Escolhida em 8 de outubro de 2026: A, Letreiro, em laranja, preto e um pouco de azul. Versão clara. Revista em 10 de outubro: ver a seção acima.** Azulejo e Poste foram descartadas; as descrições abaixo ficam como registro. A versão escura ficou como alternativa: trocar é mudar os valores de `:root` em `src/styles.css`.

## Estado atual (versão clara e laranja, em registro)

Os valores vigentes estão na seção "Revisão de 10 de outubro de 2026". Os tokens de função estão em `src/styles.css` e as telas só usam esses nomes (`bg-primary`, `text-muted-foreground`, `border-input`...).

| Papel                                    | Token                                          | Valor         | Observação                                                                       |
| ---------------------------------------- | ---------------------------------------------- | ------------- | -------------------------------------------------------------------------------- |
| Fundo                                    | `background`                                   | `#FDFDFB`     | Cal                                                                              |
| Texto, bordas fortes, faixa do cabeçalho | `foreground`, `header`                         | `#131416`     | 18,1:1 sobre Cal                                                                 |
| Ação                                     | `primary`                                      | `#FF7A1A`     | Sempre fundo com texto preto (7,1:1). Como texto sobre claro só 2,6:1: **nunca** |
| Ação secundária                          | `secondary`                                    | `#131416`     | Texto branco                                                                     |
| Texto secundário                         | `muted-foreground`                             | `#5F6672`     | 5,7:1                                                                            |
| Borda de campo                           | `input`                                        | `#5F6672`     | 5,7:1 (mínimo 3)                                                                 |
| Links, etiquetas, foco                   | `info`, `ring`                                 | `#2B4FD9`     | 6,4:1 sobre Cal; só em pequenos pontos                                           |
| Situações                                | `success`, `warning`, `destructive`, `neutral` | ver o arquivo | Sempre cor, ícone e nome                                                         |

O teste `src/test/contraste-dos-tokens.test.ts` lê o `styles.css` e falha se qualquer par deixar de passar.

**Fontes:** Bricolage Grotesque nos títulos (`font-display`) e Figtree no texto (`font-sans`), pelo Google Fonts, com `preconnect`. Hospedar as fontes no próprio site fica para a Fase 5.

**Componentes** em `src/components/ui/`: Button, Input, Textarea, NativeSelect, Campo (rótulo, ajuda e erro ligados ao controle), Badge, Dialog, AlertDialog, Sheet, Sonner. Do site: Marca (o ON que acende) e EstadoDeFuncionamento. Do painel: ListaAdaptavel (tabela no computador, cartões no celular), Indicador, EstadoVazio, SecaoAdmin.

**Travas:** `src/test/regras-de-interface.test.ts` impede texto abaixo de 14px e `confirm` do navegador.

---

**Veja as três funcionando** em `/identidade` (`npm run dev`, depois http://localhost:8080/identidade). A página usa os serviços, os preços e a agenda do protótipo, calcula o "aberto agora" e o próximo horário livre na hora, e tem um seletor para ver o "ON" aceso e apagado. `/identidade?estado=aberto` abre já com o ON aceso. A página é temporária e some quando a direção for escolhida.

Os contrastes foram calculados pelo código da própria página, que mostra o valor de cada par. Os pares de texto atendem ao mínimo de 4,5:1, e bordas de campo ao de 3:1. A construção das propostas revelou dois ajustes, já incorporados abaixo: a borda dos campos do Azulejo e o uso do azul do Poste.

### A — Letreiro (recomendada)

A placa pintada à mão na fachada e a tabela de preços na parede. Popular, alegre e muito legível.

| Cor          | Hex       | Uso                                                                  |
| ------------ | --------- | -------------------------------------------------------------------- |
| Cal          | `#FDFDFB` | Fundo                                                                |
| Tinta        | `#16181D` | Texto (17,4:1 sobre Cal)                                             |
| Azul placa   | `#1F3FBF` | Ações, links, marca (texto branco sobre ele: 8,3:1)                  |
| Amarelo gema | `#FFC42E` | Destaques e o "ON" aceso, sempre como fundo de texto escuro (11,2:1) |
| Cimento      | `#5F6672` | Texto secundário (5,7:1)                                             |
| Tijolo       | `#C8321E` | Erros e cancelamentos (5,3:1)                                        |

**Tipografia**: Bricolage Grotesque nos títulos, uma fonte com desenho irregular que lembra letra pintada sem imitar caligrafia; Figtree no texto. Preços e horários com algarismos de largura fixa, para alinhar em coluna.

**Abertura da página inicial**: a própria tabela de preços. Em vez de uma foto com frase, o visitante vê os serviços como na parede da barbearia, e cada linha já leva ao agendamento.

```
┌────────────────────────────────┐
│ [ON]-STYLE           Agendar   │
│ Aberto agora, até as 19h       │
├────────────────────────────────┤
│ Corte clássico                 │
│ 30 min                  R$ 45  │
│────────────────────────────────│
│ Barba e navalha                │
│ 30 min                  R$ 35  │
│────────────────────────────────│
│ Corte + barba   (mais pedido)  │
│ 60 min                  R$ 70  │
├────────────────────────────────┤
│ Próximo horário: hoje, 15:30   │
│ [ Agendar às 15:30 ]           │
└────────────────────────────────┘
```

**Por que recomendo**: é a que mais se parece com "de bairro e acessível", funciona sob sol na tela do celular e não se confunde com nenhum outro site de barbearia.
**Risco**: azul e amarelo são fortes; pedem disciplina para o amarelo aparecer pouco.

### B — Azulejo

A parede de azulejo, a louça da pia, a capa de corte. Limpa, fresca e tranquila.

| Cor            | Hex       | Uso                                                                   |
| -------------- | --------- | --------------------------------------------------------------------- |
| Louça          | `#FFFFFF` | Fundo                                                                 |
| Gelo           | `#EEF4F3` | Superfícies e faixas                                                  |
| Marinho capa   | `#12263A` | Texto (15,4:1 sobre Louça)                                            |
| Verde azulejo  | `#17695A` | Ações e marca (5,9:1 sobre Gelo)                                      |
| Rejunte        | `#C9D3D1` | Divisórias (só decoração)                                             |
| Linha de campo | `#6F8581` | Borda de campos e azulejos (3,9:1)                                    |
| Vermelho poste | `#D93A2B` | Só no "ON" aceso e em alertas, sempre sobre Louça ou com texto branco |

**Tipografia**: Gabarito nos títulos, geométrica e amigável; Hanken Grotesk no texto.

**Abertura da página inicial**: os próximos horários livres como uma fileira de azulejos. Tocar num deles já inicia o agendamento. A mesma grade de azulejos é o seletor de horário no fluxo de reserva.

```
┌────────────────────────────────┐
│ [ON]-STYLE           Agendar   │
│ Aberto agora, até as 19h       │
├────────────────────────────────┤
│ Horários livres hoje           │
│ ┌──────┬──────┬──────┬──────┐  │
│ │15:30 │16:00 │16:30 │17:30 │  │
│ └──────┴──────┴──────┴──────┘  │
│ Ver outros dias                │
├────────────────────────────────┤
│ Corte clássico   30 min  R$ 45 │
│ Barba e navalha  30 min  R$ 35 │
└────────────────────────────────┘
```

**Ponto forte**: o caminho mais curto até a reserva; visual calmo e confiável.
**Risco**: é a mais discreta das três; depende de boas fotos para ter calor.

### C — Poste

O poste listrado de barbeiro, à noite. Para quem quer manter um site escuro, sem cair no preto com laranja.

| Cor            | Hex       | Uso                                                                 |
| -------------- | --------- | ------------------------------------------------------------------- |
| Marinho noite  | `#0F1B33` | Fundo                                                               |
| Marinho raso   | `#182A4D` | Superfícies                                                         |
| Branco         | `#F5F7FA` | Texto (16,0:1)                                                      |
| Névoa          | `#9FB3D1` | Texto secundário (8,0:1)                                            |
| Vermelho poste | `#D42A22` | Ação principal (texto branco: 5,1:1)                                |
| Azul poste     | `#2458E0` | Só como preenchimento com texto branco (5,9:1): seleção e etiquetas |
| Azul claro     | `#7FA6FF` | Links e texto de destaque (7,2:1 sobre Marinho noite)               |
| Rosa de erro   | `#FF9A92` | Mensagens de erro (8,4:1 sobre Marinho noite)                       |

**Tipografia**: uma só família, Archivo, em duas larguras: expandida nos títulos, normal no texto.

**Abertura da página inicial**: o nome grande, com o "ON" aceso, e as listras diagonais do poste como único grafismo. As listras reaparecem na barra de progresso do agendamento.

```
┌────────────────────────────────┐
│ ////////////////////////////// │
│                                │
│  [ON]                          │
│  STYLE                         │
│                                │
│  Aberto agora, até as 19h      │
│  [ Agendar horário ]           │
├────────────────────────────────┤
│ Corte clássico   30 min  R$ 45 │
└────────────────────────────────┘
```

**Ponto forte**: a mais marcante e a que menos rompe com o que você já viu no protótipo.
**Risco**: fundo escuro lê pior ao ar livre e combina menos com "acessível".

### Revisão crítica das propostas

Antes de fechar, comparei cada direção com o que qualquer gerador produziria para "site de barbearia":

- Uma quarta ideia, de papel pardo com carimbo de cartão fidelidade, foi descartada: cairia no creme com tom terroso que hoje identifica páginas feitas por IA.
- A direção escura só ficou porque usa as duas cores do poste sobre azul-marinho, e não um preto com um único destaque, que é exatamente o protótipo atual.
- Nenhuma usa rótulo em caixa alta sobre os títulos, numeração 01/02/03, palavra colorida no fim do título ou setas dentro de botões.

## Fundamentos (valem para qualquer direção)

### Tokens em três níveis

1. **Paleta**: as cores com nome, como nas tabelas acima.
2. **Função**: `fundo`, `superficie`, `texto`, `texto-suave`, `borda`, `acao`, `sobre-acao`, `sucesso`, `aviso`, `perigo`. As telas só usam este nível.
3. **Componente**: ajustes específicos, quando necessários.

Trocar a identidade no futuro significa alterar o primeiro nível, sem tocar nas telas. As sobras do modelo original (tema `.dark` azulado, cores `--sidebar-*`) são removidas.

### Escala

| Tema      | Regra                                                                                   |
| --------- | --------------------------------------------------------------------------------------- |
| Texto     | Corpo em 16px; nenhum texto abaixo de 14px. Escala: 14, 16, 18, 20, 24, 32, 40, 56      |
| Linha     | No máximo 75 caracteres por linha                                                       |
| Espaço    | Múltiplos de 4px                                                                        |
| Toque     | Todo alvo de toque com pelo menos 44px                                                  |
| Cantos    | Raio maior em blocos grandes, menor em controles; não um raio único para tudo           |
| Contraste | Mínimo de 4,5:1 em texto e 3:1 em ícones e bordas de campos                             |
| Telas     | Desenhado a partir de 360px e ampliado em 640, 768, 1024 e 1280px                       |
| Movimento | Só em resposta a uma ação (abrir, confirmar, avançar). "Reduzir movimento" é respeitado |
| Tema      | Um tema só, o da direção escolhida. Não mantemos claro e escuro em paralelo             |

### Componentes

Dos 46 componentes instalados ficam os que têm uso; os demais saem e podem voltar quando houver necessidade.

| Componente                           | Substitui ou resolve                                                          |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| Botão, Campo, Seleção, Área de texto | Campos com rótulo, ajuda e erro ligados ao campo certo                        |
| Faixa de dias e Grade de horários    | O seletor de data nativo do navegador                                         |
| Linha de serviço                     | Os cartões numerados atuais                                                   |
| Selo de situação                     | Texto solto; cada situação ganha cor, ícone e nome                            |
| Passos                               | O indicador do fluxo de agendamento, o único lugar onde numeração faz sentido |
| Diálogo de confirmação               | `window.confirm`                                                              |
| Aviso temporário                     | A faixa de aviso do painel                                                    |
| Lista adaptável                      | Tabela no computador, lista de linhas no celular, sem rolagem horizontal      |
| Estado vazio, Carregando             | Telas sem dados e espera de rede, que hoje não existem                        |
| Sino de alertas                      | Novo                                                                          |
| Estrutura do painel                  | Menu lateral no computador; barra inferior no celular                         |

### Voz

Frases curtas, como o barbeiro falaria. Maiúscula só no início da frase.

| Em vez de                | Escrever                                                               |
| ------------------------ | ---------------------------------------------------------------------- |
| RESERVE SUA CADEIRA      | Agendar horário                                                        |
| QUAL É O SEU RITUAL?     | Qual serviço?                                                          |
| MEUS MOMENTOS            | Meus horários                                                          |
| Continuar                | O que acontece em seguida: "Escolher horário", "Confirmar agendamento" |
| Não foi possível agendar | "Esse horário acabou de ser reservado. Escolha outro."                 |
| Page not found           | "Não achamos essa página." com um botão "Ir para o início"             |

Um botão mantém o mesmo nome do começo ao fim: quem toca em "Confirmar agendamento" lê "Agendamento confirmado".

### Fotografia

- Fotos reais de barbearia, de bancos como Unsplash e Pexels, com a licença conferida e o crédito anotado em `docs/creditos-imagens.md`. Nenhuma imagem gerada por IA.
- Preferência por cenas comuns e luz natural, sem estúdio nem modelos, para combinar com "de bairro".
- Arquivos dentro do projeto, em formatos leves e em mais de um tamanho.
- Cada foto ocupa um espaço de proporção fixa, para ser trocada pela foto real da ON-STYLE sem refazer a página.

## Experiência por área

### Site e agendamento

- A página inicial responde, nesta ordem: está aberto? quanto custa? quando tem vaga? onde fica?
- Agendamento em três passos, com o login só no fim.
- Dias sem vaga aparecem desabilitados na faixa de dias, em vez de o cliente descobrir clicando.
- Na confirmação: adicionar à agenda do celular e como chegar.

### Conta do cliente

- Próximos horários no topo; histórico abaixo.
- "Agendar de novo" repete o último serviço em um toque.
- Remarcar é uma ação própria, sem precisar cancelar e começar de novo.

### Painel do dono

A tela inicial deixa de ser um conjunto de números e passa a ser o dia de trabalho:

```
┌────────────────────────────────┐
│ Hoje, quinta                 🔔 │
│ 6 horários, 2 livres           │
├────────────────────────────────┤
│ Agora                          │
│ 14:30  João Silva              │
│        Corte + barba, 60 min   │
│        [ Concluir ]            │
├────────────────────────────────┤
│ 15:30  livre                   │
│ 16:00  Pedro Souza   Agendado  │
│        Corte clássico          │
│        [ Confirmar ]           │
│ 16:30  livre                   │
├────────────────────────────────┤
│ Hoje   Agenda   Vendas   Mais  │
└────────────────────────────────┘
```

- Um toque avança a situação do cliente.
- "Bloquear horário" sempre à mão.
- Os números (faturamento, ticket médio, serviços mais pedidos) continuam existindo, na área Financeiro.
- No computador, a mesma informação ganha a visão da semana ao lado.
