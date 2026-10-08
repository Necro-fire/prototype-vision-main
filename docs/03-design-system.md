# 03 — Identidade e Design System

## De onde parte o desenho

| | |
| --- | --- |
| **O que é** | ON-STYLE, barbearia de bairro com um barbeiro e clientela fiel |
| **Quem usa** | Moradores da região, quase sempre pelo celular, muitas vezes na rua; e o próprio barbeiro, com o telefone na mão entre um corte e outro |
| **Trabalho do site** | Mostrar o preço e marcar um horário em menos de um minuto |
| **Trabalho do painel** | Responder "quem é o próximo?" sem precisar procurar |

O protótipo veste a barbearia com o uniforme de todo site do ramo: fundo quase preto, um laranja, títulos condensados em caixa alta, frases de efeito ("Reserve sua cadeira", "Qual é o seu ritual?"). Isso comunica uma barbearia cara e distante. Uma barbearia de bairro é o contrário: clara, direta, com o preço na parede e o cliente chamado pelo nome.

As três direções abaixo saem do mundo real de uma barbearia de bairro brasileira: a placa pintada à mão, o azulejo da parede e o poste listrado da porta.

## O elemento em comum: o "ON"

O nome traz um interruptor. Em qualquer direção escolhida, o "ON" da marca mostra se a barbearia está aberta naquele momento:

- Aberta: o "ON" aparece aceso, com a frase "Aberto agora, até as 19h".
- Fechada: o "ON" aparece apagado, com "Fechado. Abre amanhã às 9h".

É a informação mais útil para quem mora perto, vem direto do nome e não existe em nenhum modelo pronto. É a única ousadia da identidade; todo o resto fica discreto ao redor dela.

## Três direções de identidade

Os contrastes citados foram calculados; todos os pares de texto atendem ao mínimo de 4,5:1 para leitura.

### A — Letreiro (recomendada)

A placa pintada à mão na fachada e a tabela de preços na parede. Popular, alegre e muito legível.

| Cor | Hex | Uso |
| --- | --- | --- |
| Cal | `#FDFDFB` | Fundo |
| Tinta | `#16181D` | Texto (17,4:1 sobre Cal) |
| Azul placa | `#1F3FBF` | Ações, links, marca (texto branco sobre ele: 8,3:1) |
| Amarelo gema | `#FFC42E` | Destaques e o "ON" aceso, sempre como fundo de texto escuro (11,2:1) |
| Cimento | `#5F6672` | Texto secundário (5,7:1) |
| Tijolo | `#C8321E` | Erros e cancelamentos (5,3:1) |

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

| Cor | Hex | Uso |
| --- | --- | --- |
| Louça | `#FFFFFF` | Fundo |
| Gelo | `#EEF4F3` | Superfícies e faixas |
| Marinho capa | `#12263A` | Texto (15,4:1 sobre Louça) |
| Verde azulejo | `#17695A` | Ações e marca (5,9:1 sobre Gelo) |
| Rejunte | `#C9D3D1` | Linhas e divisórias |
| Vermelho poste | `#D93A2B` | Só no "ON" aceso e em alertas |

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

| Cor | Hex | Uso |
| --- | --- | --- |
| Marinho noite | `#0F1B33` | Fundo |
| Marinho raso | `#182A4D` | Superfícies |
| Branco | `#F5F7FA` | Texto (16,0:1) |
| Névoa | `#9FB3D1` | Texto secundário (8,0:1) |
| Vermelho poste | `#D42A22` | Ação principal (texto branco: 5,1:1) |
| Azul poste | `#2458E0` | Ação secundária e seleção (texto branco: 5,9:1) |

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

| Tema | Regra |
| --- | --- |
| Texto | Corpo em 16px; nenhum texto abaixo de 14px. Escala: 14, 16, 18, 20, 24, 32, 40, 56 |
| Linha | No máximo 75 caracteres por linha |
| Espaço | Múltiplos de 4px |
| Toque | Todo alvo de toque com pelo menos 44px |
| Cantos | Raio maior em blocos grandes, menor em controles; não um raio único para tudo |
| Contraste | Mínimo de 4,5:1 em texto e 3:1 em ícones e bordas de campos |
| Telas | Desenhado a partir de 360px e ampliado em 640, 768, 1024 e 1280px |
| Movimento | Só em resposta a uma ação (abrir, confirmar, avançar). "Reduzir movimento" é respeitado |
| Tema | Um tema só, o da direção escolhida. Não mantemos claro e escuro em paralelo |

### Componentes

Dos 46 componentes instalados ficam os que têm uso; os demais saem e podem voltar quando houver necessidade.

| Componente | Substitui ou resolve |
| --- | --- |
| Botão, Campo, Seleção, Área de texto | Campos com rótulo, ajuda e erro ligados ao campo certo |
| Faixa de dias e Grade de horários | O seletor de data nativo do navegador |
| Linha de serviço | Os cartões numerados atuais |
| Selo de situação | Texto solto; cada situação ganha cor, ícone e nome |
| Passos | O indicador do fluxo de agendamento, o único lugar onde numeração faz sentido |
| Diálogo de confirmação | `window.confirm` |
| Aviso temporário | A faixa de aviso do painel |
| Lista adaptável | Tabela no computador, lista de linhas no celular, sem rolagem horizontal |
| Estado vazio, Carregando | Telas sem dados e espera de rede, que hoje não existem |
| Sino de alertas | Novo |
| Estrutura do painel | Menu lateral no computador; barra inferior no celular |

### Voz

Frases curtas, como o barbeiro falaria. Maiúscula só no início da frase.

| Em vez de | Escrever |
| --- | --- |
| RESERVE SUA CADEIRA | Agendar horário |
| QUAL É O SEU RITUAL? | Qual serviço? |
| MEUS MOMENTOS | Meus horários |
| Continuar | O que acontece em seguida: "Escolher horário", "Confirmar agendamento" |
| Não foi possível agendar | "Esse horário acabou de ser reservado. Escolha outro." |
| Page not found | "Não achamos essa página." com um botão "Ir para o início" |

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
