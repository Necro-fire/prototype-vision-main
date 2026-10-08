# 01 — Diagnóstico do sistema atual

Baseado na leitura de todo o código em 8 de outubro de 2026. As dependências não estão instaladas nesta pasta, então os testes e a compilação não foram executados; o que está descrito vem da leitura do código.

## Arquitetura atual

| Camada             | O que existe                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework          | TanStack Start (renderização no servidor) com React 19 e rotas por arquivo                                                                  |
| Estilo             | Tailwind 4 e 46 componentes shadcn/ui instalados; na prática a interface é feita com classes CSS manuais em [styles.css](../src/styles.css) |
| Estado             | Um único `ShopProvider` com `useState`, montado na raiz ([barbershop.tsx](../src/lib/barbershop.tsx))                                       |
| Dados              | Nenhum banco, nenhuma API, nenhum armazenamento local                                                                                       |
| Autenticação       | Nenhuma real                                                                                                                                |
| Build e publicação | Preset fechado do Lovable (`@lovable.dev/vite-tanstack-config`), compilando para Cloudflare                                                 |
| Testes             | Vitest: 5 testes de regras de agenda, 2 de administrador e financeiro, 1 de roteamento                                                      |
| Versionamento      | A pasta não é um repositório git                                                                                                            |

### Páginas existentes

| Rota             | Função                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| `/`              | Página inicial com serviços, texto institucional, produtos e chamada para agendar                         |
| `/servicos`      | Catálogo de serviços com filtro por categoria                                                             |
| `/produtos`      | Vitrine de produtos com janela de detalhes                                                                |
| `/contato`       | Horário de funcionamento; endereço e canais "a definir"                                                   |
| `/agendamento`   | Fluxo em quatro passos: serviço, data e horário, dados, confirmação                                       |
| `/cliente`       | Lista de agendamentos de quem informar um celular; permite cancelar                                       |
| `/admin`         | Login demonstrativo e visão geral                                                                         |
| `/admin/$module` | Agendamentos, serviços, produtos, clientes, vendas, financeiro e configurações, todos no mesmo componente |

## O que funciona e será preservado

Estas são as funcionalidades reais do protótipo. Todas continuam existindo ao final de cada fase do roadmap.

- **Cálculo de horários disponíveis** como função pura e testada: respeita abertura e fechamento, a duração do serviço, dias fechados, conflitos durante todo o atendimento e libera horários cancelados ([barbershop.tsx:34](../src/lib/barbershop.tsx#L34)).
- **Normalização de celular** com e sem `+55`, testada.
- **Fluxo de agendamento em passos** com resumo lateral e entrada direta a partir de um serviço do catálogo.
- **Preço e duração gravados no agendamento** no momento da reserva, de modo que mudar o preço depois não altera o que já foi marcado.
- **Catálogo único** para o site e para o painel: editar ou desativar um serviço ou produto reflete imediatamente na área pública.
- **Seis situações de agendamento**: Agendado, Confirmado, Em atendimento, Concluído, Cancelado, Não compareceu.
- **Registro de vendas de produtos** e **faturamento bruto** com filtros por data, serviço e produto, com teste.
- **Horário e dias de funcionamento configuráveis**, refletidos na agenda e na página de contato.
- **Cuidados de base**: título e descrição próprios em cada página, idioma `pt-BR`, respeito a "reduzir movimento", rótulos para leitores de tela nos botões de ícone.
- **Organização das rotas**: páginas públicas independentes e painel dentro de uma rota-mãe.

## Falhas

A coluna "Gravidade" usa: **Bloqueia** (impede uso real), **Alta**, **Média**, **Baixa**.

### Segurança

| #   | Falha                                                                                                                 | Gravidade | Onde                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------- |
| S1  | E-mail e senha do administrador estão escritos no código enviado ao navegador e são exibidos na própria tela de login | Bloqueia  | [barbershop.tsx:23](../src/lib/barbershop.tsx#L23), [admin.tsx:47](../src/routes/admin.tsx#L47) |
| S2  | O acesso administrativo é uma variável no navegador; não existe verificação no servidor                               | Bloqueia  | [barbershop.tsx:53](../src/lib/barbershop.tsx#L53)                                              |
| S3  | Qualquer pessoa que digite um celular vê o nome e os agendamentos daquele número e pode cancelá-los                   | Bloqueia  | [cliente.tsx](../src/routes/cliente.tsx)                                                        |
| S4  | No agendamento, digitar um celular revela o nome do cliente cadastrado ("Bem-vindo de volta, …")                      | Alta      | [agendamento.tsx:12](../src/routes/agendamento.tsx#L12)                                         |
| S5  | Qualquer tela pode alterar qualquer agendamento: a função que modifica a lista inteira é exposta a todos              | Alta      | [barbershop.tsx:66](../src/lib/barbershop.tsx#L66)                                              |
| S6  | Não há política de privacidade, consentimento nem forma de o cliente excluir seus dados (LGPD)                        | Alta      | —                                                                                               |
| S7  | O `.gitignore` não ignora arquivos `.env`; chaves poderiam ser enviadas ao repositório por engano                     | Média     | [.gitignore](../.gitignore)                                                                     |

### Dados e regras de negócio

| #   | Falha                                                                                                        | Gravidade | Onde                                                        |
| --- | ------------------------------------------------------------------------------------------------------------ | --------- | ----------------------------------------------------------- |
| D1  | Nada é salvo: recarregar a página apaga serviços editados, clientes, agendamentos e vendas                   | Bloqueia  | [barbershop.tsx:45](../src/lib/barbershop.tsx#L45)          |
| D2  | Cada visitante tem seus próprios dados; o dono não vê agendamentos feitos em outro aparelho                  | Bloqueia  | idem                                                        |
| D3  | Dois clientes poderiam reservar o mesmo horário ao mesmo tempo; a verificação é local                        | Bloqueia  | idem                                                        |
| D4  | Datas e horas são texto sem fuso horário e dependem do relógio do aparelho do cliente                        | Alta      | [barbershop.tsx:31](../src/lib/barbershop.tsx#L31)          |
| D5  | Valores em reais são números decimais, sujeitos a erros de arredondamento em somas                           | Média     | [barbershop.tsx:4](../src/lib/barbershop.tsx#L4)            |
| D6  | A situação do agendamento é texto livre e aceita qualquer mudança, inclusive de Cancelado para Concluído     | Média     | [admin-panel.tsx:12](../src/components/admin-panel.tsx#L12) |
| D7  | A grade de horários anda sempre de 30 em 30 minutos; um serviço de 15 minutos desperdiça metade do intervalo | Baixa     | [barbershop.tsx:38](../src/lib/barbershop.tsx#L38)          |
| D8  | O selo "O mais pedido" está fixo no serviço de número 3, não vem de dados reais                              | Baixa     | [service-list.tsx:7](../src/components/service-list.tsx#L7) |
| D9  | A página inicial mostra "Segunda a sábado · 09h às 19h" fixo, sem seguir as configurações                    | Baixa     | [index.tsx:15](../src/routes/index.tsx#L15)                 |
| D10 | Vendas aceitam qualquer data, não registram forma de pagamento e não podem ser corrigidas nem estornadas     | Média     | [barbershop.tsx:55](../src/lib/barbershop.tsx#L55)          |

### Funcionalidades incompletas

| Área            | O que falta                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Agenda          | Intervalo de almoço, feriados, férias, bloqueio manual; horários diferentes por dia da semana                                  |
| Cliente         | Criar conta, remarcar, ver histórico separado dos próximos horários, editar perfil                                             |
| Painel          | Visão do dia, remarcar ou editar agendamento, detalhe do cliente, excluir serviço ou produto                                   |
| Catálogo        | Categorias fixas no código; todos os produtos usam a mesma foto                                                                |
| Financeiro      | Só faturamento bruto de um dia; sem forma de pagamento, caixa, descontos ou fidelidade                                         |
| Empresa         | Nome, endereço e canais de contato não são editáveis; aparecem como "A definir"                                                |
| Comunicação     | Nenhum aviso é enviado a ninguém                                                                                               |
| Páginas de erro | "Página não encontrada" e a tela de erro estão em inglês num site em português ([__root.tsx:17](../src/routes/__root.tsx#L17)) |

### Código e manutenção

| #   | Problema                                                                                                                                                                                                                               | Gravidade                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| C1  | Código compactado em linhas enormes: [admin-panel.tsx](../src/components/admin-panel.tsx) tem 26 linhas, uma delas com 2.296 caracteres, e concentra oito módulos num só componente. É difícil de ler, revisar e alterar com segurança | Alta                             |
| C2  | Toda a lógica e os tipos estão num único arquivo de 73 linhas compactadas                                                                                                                                                              | Alta                             |
| C3  | 46 componentes shadcn instalados, 3 usados (botão, campo de texto e janela). Formulários, consultas, validação, gráficos e datas têm bibliotecas instaladas e nunca utilizadas                                                         | Média                            |
| C4  | Duas formas de estilizar convivem: Tailwind com tokens e cerca de 300 linhas de CSS global manual, com `!important` para forçar estados                                                                                                | Média                            |
| C5  | O tema `.dark` e as cores `--sidebar-*` são sobras azuladas do modelo original, sem relação com a marca                                                                                                                                | Baixa                            |
| C6  | Dependência do Lovable em quatro pontos: preset de build, relatório de erros, fotos em `/__l5e/assets-v1/…` e instruções do `AGENTS.md`                                                                                                | Alta, dado que você decidiu sair |
| C7  | Sem git, sem integração contínua e sem variáveis de ambiente                                                                                                                                                                           | Alta                             |
| C8  | O arquivo de travamento é do Bun, o README manda usar npm, e o Bun não está instalado nesta máquina                                                                                                                                    | Baixa                            |

### Experiência e interface

| #   | Problema                                                                                                                                                                                                                     | Gravidade |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| U1  | Texto pequeno demais: a folha de estilos tem 125 definições de fonte com 12px ou menos, 52 delas com 9px ou menos, chegando a 5px. No celular há rótulos de 6 e 7px                                                          | Alta      |
| U2  | Identidade genérica: fundo quase preto com um laranja, títulos condensados em caixa alta, rótulo espaçado sobre cada título, numeração 01/02/03 em listas que não são sequências e uma palavra laranja no fim de cada título | Alta      |
| U3  | Botões e campos abaixo do tamanho mínimo de toque (35px de altura, seletores com fonte de 9px)                                                                                                                               | Alta      |
| U4  | O painel é uma tabela com rolagem horizontal no celular. Para um barbeiro que consulta o telefone entre atendimentos, falta a tela "o que vem agora"                                                                         | Alta      |
| U5  | Controles nativos sem padrão: seletor de data do navegador, listas suspensas sem estilo e confirmação por `window.confirm`                                                                                                   | Média     |
| U6  | Mensagens de erro não ficam ligadas ao campo com problema; o menu do celular não gerencia o foco                                                                                                                             | Média     |
| U7  | Fontes carregadas do Google de forma bloqueante; nenhuma imagem de compartilhamento nem dados estruturados de negócio local                                                                                                  | Baixa     |
| U8  | O layout foi escrito do computador para o celular, com dezenas de exceções por largura de tela                                                                                                                               | Média     |

## Limitações que definem o trabalho

- Não há **dados** a migrar nem **integrações** a manter além do Lovable. Isso dá liberdade para modelar o banco corretamente desde o início.
- As regras do `AGENTS.md` atual descrevem o protótipo (dados no `ShopProvider`, fotos por ponteiros do Lovable). Elas deixam de valer e serão substituídas pelo `CLAUDE.md` proposto.
- Nesta máquina há Node 24, npm 11 e git. Não há Bun, Docker, nem as ferramentas de linha de comando do Supabase e do GitHub. O plano considera isso: usa npm e um projeto Supabase de desenvolvimento na nuvem, sem exigir Docker.
