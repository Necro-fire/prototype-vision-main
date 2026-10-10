# 05 — Roadmap de implementação

Sem datas, por decisão sua: cada fase começa quando a anterior é aprovada. O tamanho indica o esforço relativo (P, M, G).

## Prioridades

| Prioridade | Significado                                      | O que entra                                                                          |
| ---------- | ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| **P0**     | Sem isso o sistema não pode ser usado de verdade | Salvar dados, login real, permissões, horário sem conflito, independência do Lovable |
| **P1**     | Necessário para a primeira versão ser boa        | Nova identidade, texto legível, tela "Hoje", bloqueios, sino e e-mails               |
| **P2**     | Logo depois da estreia                           | Formas de pagamento e caixa                                                          |
| **P3**     | Quando o uso real pedir                          | Cupons, fidelidade, relatórios, instalação no celular                                |

## Visão geral

| Fase | Nome                                | Prioridade | Tamanho | O usuário percebe?     |
| ---- | ----------------------------------- | ---------- | ------- | ---------------------- |
| 0    | Fundação                            | P0         | M       | Não                    |
| 1    | Identidade e Design System          | P1         | G       | Sim, tudo muda de cara |
| 2    | Banco e contas                      | P0         | G       | Login real             |
| 3    | Agendamento real e conta do cliente | P0         | G       | Sim                    |
| 4    | Painel do dono, sino e e-mails      | P0 / P1    | G       | Sim                    |
| 5    | Publicação                          | P0         | M       | **Versão 1.0 no ar**   |
| 6    | Caixa e formas de pagamento         | P2         | M       | Dono                   |
| 7    | Descontos e fidelidade              | P3         | M       | Sim                    |
| 8    | Refinos                             | P3         | P       | Sim                    |

## Fase 0 — Fundação

Deixar o projeto independente, legível e seguro para evoluir, sem mudar nada do que aparece na tela.

**Situação: feita no computador, falta publicar o repositório no GitHub.** Ramificação `fase-0-fundacao`.

- [x] Criar o repositório git local, com o protótipo original como primeiro commit.
- [ ] Criar o repositório privado no GitHub e enviar o código (depende da sua conta).
- [x] Trocar o preset do Lovable por uma configuração de build própria; remover o relatório de erros do Lovable.
- [x] Trazer as fotos para dentro do projeto (as três atuais, baixadas do Lovable). Origem e licença ainda a confirmar.
- [x] Formatar todo o código e dividir os dois arquivos gigantes por área, sem alterar comportamento.
- [x] Adotar npm; ignorar `.env` no git; criar o modelo de variáveis de ambiente.
- [x] Criar `CLAUDE.md`, as Skills e o fluxo de verificação automática (ainda não executado no GitHub).
- [x] Traduzir as páginas de erro e de "não encontrada".

**Pronto quando**: o sistema roda e compila fora do Lovable, igual ao protótipo; os testes atuais passam; a verificação automática está verde no GitHub.

**Verificado:** compilação, tipos, ESLint sem erros, 21 testes (os 8 originais mais 13 de tela do painel), todas as páginas respondendo e o HTML de cada módulo do painel idêntico ao de antes da divisão. **Não verificado:** layout no celular, o fluxo de agendamento clicado no navegador e a execução da verificação automática no GitHub.

## Fase 1 — Identidade e Design System

**Situação: feita no computador.** Ramificação `fase-1-identidade`. Direção: Letreiro em laranja, preto e azul, versão clara.

- [x] Escolha da direção, por uma página de comparação (já removida do código).
- [x] Tokens, escala de texto e componentes base em `src/styles.css` e `src/components/ui/`.
- [x] Marca ON-STYLE com o "ON" aceso ou apagado conforme o horário de funcionamento.
- [x] Site público refeito: início, serviços, produtos, contato.
- [x] Agendamento (faixa de dias, grade de horários, erro em cada campo, foco acompanhando o passo) e "Meus horários" (diálogo no lugar do `confirm`).
- [x] Painel: menu lateral no computador, barra inferior no celular, listas que viram cartões no celular.
- [x] 43 componentes shadcn e 29 bibliotecas sem uso removidos; CSS antigo apagado.
- [ ] Ícone do site e imagem de compartilhamento (precisam de arte final da marca).
- [x] Fotografias: duas fotos de banco com licença registrada, em Contato e em Serviços. Entraram em 08/10/2026, por decisão do dono, e são provisórias até haver fotos próprias (Fase 8).

**Pronto quando**: nenhuma tela usa texto abaixo de 14px ou alvo de toque abaixo de 44px; o contraste passa em todas as telas; o fluxo de agendamento funciona em 360px de largura; não resta CSS do visual antigo.

**Travado em teste** (`npm run verificar`): nenhum texto abaixo de 14px no código e no CSS, nenhum `confirm` do navegador, e o contraste de cada par de cor dos tokens, lido do próprio `styles.css`.

**Verificado:** 89 testes, compilação, ESLint sem erros; telas conferidas em 1280px e em 360px de largura. **Não verificado:** teclado e leitor de tela reais (só atributos e testes), o painel com dados reais e o "aberto agora" em 360px (a captura não hidratou).

## Fase 2 — Banco e contas

**Situação: o banco está pronto e provado; a ligação com o site espera o seu projeto no Supabase.** Ramificação `fase-2-banco`.

Feito, no computador:

- [x] Três migrações em `supabase/migrations`: 13 tabelas, funções que validam as regras no banco e regras de acesso por linha (RLS) com tudo fechado por padrão.
- [x] Reserva atômica: a restrição de exclusão barra dois agendamentos sobrepostos mesmo que cheguem juntos; cancelado e falta liberam o horário.
- [x] Fuso, grade, funcionamento, bloqueios, antecedência máxima e limite de 3 agendamentos futuros por conta, tudo validado no banco.
- [x] Seed com os 6 serviços, os 3 produtos e o horário atuais, em centavos.
- [x] 70 testes que rodam num Postgres de verdade (PGlite), cada um agindo como visitante, cliente ou dono. Teste de mutação: quebrar a restrição, o privilégio ou o RLS faz a suíte falhar.
- [x] Skill `migracao-banco` e guia [06-supabase.md](06-supabase.md).

Falta, e depende de você:

- [ ] Criar o projeto `onstyle-dev` e aplicar as migrações (guia 06, passos 1 a 3). **É a primeira prova no Supabase de verdade.**
- [ ] Me passar a URL e a chave `anon` (guia 06, passo 5).

Depois disso, eu faço:

- [x] Criar conta, entrar, sair, confirmar e-mail, recuperar senha (`/criar-conta`, `/entrar`, `/recuperar-senha`, `/redefinir-senha`, `/auth/confirmar`). Google, na sequência.
- [x] Páginas de `/admin` e `/cliente` protegidas no servidor (a sessão é conferida antes de renderizar; quem não é dono não abre `/admin`).
- [x] Remover o login demonstrativo e a senha escrita no código.
- [ ] Política de privacidade, termos e aceite no cadastro (precisam do nome e do documento da barbearia).

**Pronto quando**: um cliente não consegue ler nem alterar dados de outro, comprovado por teste (feito, no banco); ninguém sem perfil de dono abre o painel (falta o login); a revisão de segurança não aponta pendência.

## Fase 3 — Agendamento real e conta do cliente

**Situação: o cálculo está pronto e provado; a ligação com os dados reais espera o projeto no Supabase.** Ramificação `fase-3-agendamento`.

Feito, no computador:

- [x] Reserva como operação única no banco, com bloqueio de sobreposição (Fase 2).
- [x] Horários livres calculados no fuso da barbearia, com intervalos por dia da semana, grade configurável e antecedência máxima: `src/features/agenda/horarios-livres.ts`, sem usar o relógio do aparelho.
- [x] **Paridade provada**: para cada horário do dia, o que o site oferece o banco aceita e o que o site esconde o banco recusa, em 7 cenários (dia livre, com agendamentos e bloqueio, almoço, domingo, longe demais, hoje e grade de 15 min). Se as regras divergirem, o teste aponta o horário.

Falta, e depende do projeto no Supabase (guia 06):

- [x] Catálogo, horários e agendamentos lidos do banco no site e no agendamento (reserva por `reservar`, no servidor do banco; quem não entrou escolhe o horário e entra para confirmar, e volta com a escolha guardada).
- [x] Conta do cliente: próximos horários, histórico, cancelar, remarcar, agendar de novo, perfil, excluir conta (`/cliente` e `/cliente/perfil`).
- [ ] Teste de ponta a ponta do fluxo completo.

**Pronto quando**: o agendamento continua lá depois de recarregar a página e aparece em outro aparelho; dois pedidos simultâneos para o mesmo horário resultam em um aceito e um recusado com mensagem clara; todos os testes de agenda do protótipo passam.

## Fase 4 — Painel do dono, sino e e-mails

**Situação: o painel, os e-mails e as fotos do catálogo estão prontos e provados por teste; falta o envio real de e-mails (depende da conta Resend do dono) e o dono cadastrar as fotos.** Ramificação `fase-4-painel`.

- [x] Tela "Hoje": próximo cliente, marcados, atendidos, previsto, linha do tempo e avanço de situação em um toque. Agenda da semana e histórico de mudanças de cada horário.
- [x] Bloqueios e folgas (dia inteiro, vários dias ou parte do dia), em Configurações.
- [x] Serviços, categorias e produtos, com ordem e "mais pedido", em centavos. Nada se apaga: desativa-se.
- [x] Fotos de serviços e produtos: o dono envia, troca e remove no cadastro (JPG, PNG ou WebP, até 5 MB), pelo Storage do Supabase (bucket público `catalogo`). Aparecem em miniatura nas listas do site e do painel. Nenhuma foto foi cadastrada ainda: item sem foto continua como antes.
- [x] Clientes: lista, busca e histórico de cada um.
- [x] Vendas e faturamento bruto com dados reais, com filtro por período, serviço e produto e resumo por dia. Estorno em vez de apagar.
- [x] Configurações: dados da barbearia (aparecem em Contato), funcionamento com almoço, regras da agenda.
- [x] Sino em tempo real e histórico de alertas.
- [x] E-mails ao cliente (confirmação, lembrete na véspera, remarcação, cancelamento) e erro de envio visível ao dono: o banco enche a fila, a rota `/api/emails/processar` envia pelo Resend, tenta de novo e, ao desistir, acende o sino. Passo a passo em `docs/07-emails.md`. Falta ligar à conta Resend e ao agendador.

**Pronto quando**: cada funcionalidade listada em "O que funciona e será preservado" do diagnóstico existe com dados reais; um agendamento feito num celular acende o sino no painel em segundos; o lembrete chega no dia anterior; um e-mail que falha aparece para o dono.

**Verificado:** testes de tela com o banco simulado, a migração nova (`salvar_funcionamento`) no Postgres de teste e a paridade das situações com o banco. **Não verificado:** o painel com a conta do dono num projeto real, o tempo real do sino (o PGlite não tem), e os e-mails (migração, texto, fila, tentativas e rota, com o Resend simulado). **Não verificado dos e-mails:** um envio de verdade pelo Resend e o agendador.

## Fase 5 — Publicação (versão 1.0)

**Situação: o código está pronto para a hospedagem Node.js (Hostinger) e conferido em máquina local; falta o que depende das suas contas e do domínio.** Ramificação `fase-5-publicacao`. Passo a passo em `docs/08-publicacao.md`.

- [ ] Publicação na Hostinger (Node.js), no domínio da barbearia; e-mails saindo do domínio próprio. _Depende de você: conta, domínio, Resend._
- [ ] Dados reais: endereço, canais, horários, serviços e preços. _Pelo painel, por você._
- [x] Cópia de segurança semanal automática do banco, cifrada (`.github/workflows/backup.yml`). Falta cadastrar os dois segredos e rodar uma vez; a restauração ainda não foi ensaiada.
- [x] Monitoramento: rota `/api/saude` para o monitor de disponibilidade e registros de erro do servidor (no painel da Hostinger). Falta criar o monitor.
- [x] Título e descrição por página, imagem de compartilhamento, `robots.txt`, mapa do site (`sitemap.xml`) e dados de negócio local (schema.org) a partir do que o dono cadastrou.
- [x] Revisão de segurança: cabeçalhos (política de conteúdo, `X-Frame-Options`, HSTS...), nenhum segredo no navegador, `npm audit` sem achados.
- [x] Acessibilidade e layout conferidos em Chrome de verdade, em 360 e 1280 pixels (axe, rolagem, tamanhos, console). Corrigidos: títulos de produto fora de ordem e lista de definição inválida em Contato.
- [ ] Desempenho medido no celular. _Ainda não medido._
- [ ] Um ensaio completo com você: agendar como cliente, atender como dono.

**Pronto quando**: você conclui o ensaio sem ajuda e autoriza a divulgação do endereço.

## Fase 6 — Caixa e formas de pagamento

**Situação: feita no computador; a migração nova espera o seu projeto no Supabase.** Ramificação `fase-6-caixa`. Migração `20261010000001_caixa.sql`.

- [x] Forma de pagamento (Pix, dinheiro, débito, crédito) ao concluir um atendimento e ao registrar uma venda. O banco recusa as duas sem ela; o histórico anterior continua, aparecendo como "Sem forma registrada".
- [x] Atendimento avulso, para o cliente sem hora marcada: o dono escolhe o serviço (o preço vem do cadastro), o nome (opcional) e a forma de pagamento. Entra como concluído, sem conta de cliente, sem acender o sino e sem ocupar a agenda. _Proposta aplicada sem confirmação prévia; veja as perguntas ao fim da fase._
- [x] Abertura e fechamento de caixa (`/admin/caixa`): abre com o troco; cada pagamento e cada estorno guardam em qual caixa entraram; ao fechar, o banco calcula o dinheiro esperado (troco + dinheiro que entrou − dinheiro estornado), compara com o contado e guarda a diferença e o resumo por forma.
- [x] Estorno de venda com motivo, autor, hora e o caixa em que saiu o dinheiro. A venda continua no histórico.
- [x] Financeiro por período e por forma de pagamento.

**Pronto quando**: o fechamento do dia bate com a soma dos lançamentos, e a diferença, quando houver, fica registrada.

**Verificado:** 23 testes novos do banco (forma obrigatória, avulso, abertura única, fechamento = soma dos lançamentos, diferença, estorno em caixa posterior, permissões) e 9 quebras de propósito, todas acusadas pelo teste; testes de tela do diálogo de pagamento, das vendas, do caixa e do financeiro por forma. **Não verificado:** as telas novas com a conta do dono num projeto real (e em 360px), e a corrida entre um pagamento e o fechamento do caixa em dois aparelhos ao mesmo tempo (o banco a trava, mas o Postgres de teste não reproduz concorrência).

## Fase 7 — Descontos e fidelidade

**Situação: feita no computador; a migração nova espera o seu projeto no Supabase.** Ramificação `fase-7-descontos`. Migração `20261011000001_descontos.sql`.

- [x] Cupons (`/admin/descontos`): o dono cria com código, percentual ou valor fixo, validade (o dia inteiro) e limite de usos; liga e desliga, sem apagar. O cliente digita o código ao confirmar o agendamento e vê o desconto na hora; o dono aplica na hora de cobrar um atendimento ou uma venda. Cancelar um horário, marcar falta ou estornar uma venda devolve o uso.
- [x] Cartão fidelidade: o dono define quantos atendimentos concluídos valem um serviço grátis e qual é o serviço. O cliente vê os pontos, o que falta e o histórico em `/cliente/fidelidade`. Na hora de cobrar, o dono marca o uso do cartão e o atendimento sai de graça, sem passar pelo caixa.
- [x] O desconto é calculado no banco, nunca passa do valor (nem escrevendo direto na tabela), e cupom e cartão não se somam. O atendimento guarda o preço do serviço e o desconto à parte, então o histórico continua fiel.
- [x] Financeiro, "Hoje" e caixa passam a usar o valor cobrado de fato; o financeiro mostra o total de descontos concedidos.
- [ ] Pacotes de serviços: ficam para quando o uso real mostrar necessidade.

**Regras que o banco garante** (todas provadas por teste): um ponto por atendimento concluído de quem tem conta e só com o programa ligado; cancelado, falta e atendimento avulso não geram ponto; o atendimento pago com pontos não gera ponto; um atendimento rende no máximo um ponto; dois resgates ao mesmo tempo não gastam o mesmo saldo duas vezes; o cliente vê só os próprios pontos; excluir a conta apaga os pontos.

**Pronto quando**: nenhum desconto ultrapassa o valor do serviço; atendimentos cancelados e faltas não geram ponto; o financeiro mostra o total de descontos concedidos.

**Verificado:** 39 testes novos do banco e 17 quebras de propósito, todas acusadas pelo teste; testes de tela do módulo Descontos, do cupom no agendamento, na conclusão e na venda, do cartão fidelidade na hora de cobrar e do cartão do cliente. **Não verificado:** as telas novas com contas reais num projeto do Supabase (e em 360px), e o envio do e-mail de confirmação com cupom (o texto do e-mail não menciona o desconto).

## Fase 8 — Refinos

**Situação: três dos quatro itens feitos no computador; o quarto depende de fotos suas.** Ramificação `fase-8-refinos`. Migração `20261012000001_avaliacoes.sql`.

- [x] Relatórios comparativos (`/admin/relatorios`): períodos prontos (7 e 30 dias, este mês e mês passado) ou datas à escolha, até um ano; compara com o período de mesmo tamanho logo antes (quanto subiu ou caiu); gráfico de barras dia a dia (por semana quando passa de 45 dias) com legenda, texto descrevendo o gráfico e a tabela com os mesmos valores; serviços mais pedidos e produtos mais vendidos; exportação em CSV (ponto e vírgula, vírgula decimal, acentos certos no Excel; texto que viraria fórmula leva uma aspa na frente).
- [x] Painel na tela inicial do celular: manifesto e ícones (`public/manifest.webmanifest`, `public/icones/`), cartão "Painel no celular" em Configurações com o botão de instalar (onde o navegador oferece) e os passos do iPhone e do Android. O ícone é **provisório**: um "ON" aceso desenhado em código; troque pela arte final da marca quando houver.
- [x] Avaliações: depois de um atendimento concluído, o cliente dá de 1 a 5 estrelas e um comentário opcional (uma vez por atendimento, em Meus horários). Entra publicada; o dono oculta ou volta a publicar em `/admin/avaliacoes` e é avisado pelo sino. A página pública `/avaliacoes` mostra média, total e as publicadas, só com o primeiro nome e a inicial do sobrenome. Excluir a conta apaga as avaliações da pessoa.
- [ ] Fotos próprias da ON-STYLE no lugar das do banco de imagens. _Depende de você: as fotos._ Quando houver, entram em `public/fotos/` com o registro em `docs/creditos-imagens.md` (passo a passo lá).

**Verificado:** 14 testes novos do banco e 9 quebras de propósito (avaliação) todas acusadas; testes das contas dos relatórios, do CSV, das telas de relatórios, avaliações e instalação, e do manifesto (arquivos e tamanhos dos ícones). **Não verificado:** a instalação num celular de verdade (iPhone e Android), o gráfico em 360px num navegador, e a leitura do CSV no Excel.

## Revisão visual: Letreiro noturno

**Situação: feita no computador, na ramificação `fase-8-refinos`.** Só apresentação: nenhuma regra de negócio, rota ou contrato mudou.

- [x] Tokens, fonte (Archivo) e componentes base novos (`docs/03-design-system.md`, seção "Revisão de 10 de outubro de 2026"): tema escuro, laranja e azul, cantos retos, sem sombra suave.
- [x] Página inicial refeita: tabela de preços na abertura, faixa azul, passos, quem somos, cartão fidelidade, avaliações reais e quadro de horários da semana.
- [x] Painel: menu lateral com item ativo marcado por régua laranja, números do dia e da barbearia em cartões retos, tabelas, formulários, diálogos e avisos no mesmo tema; estados de espera com barras.
- [x] Ícone do painel e manifesto na nova paleta.

**Verificado:** contraste de todos os pares de token por teste e varredura do texto renderizado (site em 390px e 1280px, painel em 1280px); telas conferidas no Chrome. **Não verificado:** o painel com dados reais (as capturas usaram a tela sem conta), leitor de tela em todas as telas e o e-mail em clientes de e-mail reais.

## Riscos e como são tratados

| Risco                                             | Tratamento                                                                                    |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| A saída do preset do Lovable quebrar a compilação | É a primeira tarefa da Fase 0, isolada, com o protótipo como referência de comparação         |
| As fotos atuais se perderem ao desconectar        | Baixar antes; se não der, entram as do banco de imagens                                       |
| Erro de permissão expor dados de clientes         | Tabelas nascem fechadas; teste de permissão obrigatório; revisão de segurança nas fases 2 e 5 |
| E-mails caírem em spam                            | Envio pelo domínio da barbearia, com as autenticações de remetente configuradas na Fase 5     |
| Limites dos planos gratuitos                      | Conferidos na criação de cada conta; aviso antes de qualquer custo                            |
| Escopo crescer no meio de uma fase                | Ideias novas entram no roadmap, não na fase em andamento                                      |

## Fora do escopo, por decisão

Pagamento online, loja virtual, controle de estoque, vários barbeiros ou unidades, WhatsApp e SMS, prazo mínimo de cancelamento, controle de faltas e relatório de despesas e lucro. A estrutura não impede incluir qualquer um deles depois.
