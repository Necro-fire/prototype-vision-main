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

- Página de comparação das três direções, se você quiser decidir vendo; em seguida, a direção escolhida é fechada.
- Marca ON-STYLE com o "ON" aceso ou apagado, ícone do site e imagem de compartilhamento.
- Tokens, escala de texto e espaço, e os componentes base.
- Site público refeito: início, serviços, produtos, contato.
- Fluxo de agendamento e conta do cliente com a nova interface, ainda sobre dados de demonstração.
- Estrutura do painel: menu lateral no computador, barra inferior no celular.
- Remoção dos componentes e bibliotecas sem uso.

**Pronto quando**: nenhuma tela usa texto abaixo de 14px ou alvo de toque abaixo de 44px; o contraste passa em todas as telas; o fluxo de agendamento funciona em 360px de largura; não resta CSS do visual antigo.

## Fase 2 — Banco e contas

- Projetos Supabase de desenvolvimento e produção.
- Tabelas da primeira versão, com regras de acesso e testes de permissão para cada linha da tabela de perfis.
- Dados iniciais: os seis serviços e três produtos atuais, ou os reais, se você já os tiver enviado.
- Criar conta, entrar, sair, confirmar e-mail, recuperar senha, entrar com Google.
- Páginas de `/admin` e `/cliente` protegidas no servidor; conta do dono atribuída.
- Remoção do login demonstrativo e da senha escrita no código.
- Política de privacidade, termos e aceite no cadastro.

**Pronto quando**: um cliente não consegue ler nem alterar dados de outro, comprovado por teste; ninguém sem perfil de dono abre o painel; a revisão de segurança não aponta pendência.

## Fase 3 — Agendamento real e conta do cliente

- Catálogo e horários lidos do banco, no site e no agendamento.
- Reserva como operação única no banco, com bloqueio de sobreposição.
- Horários calculados no fuso da barbearia; intervalos por dia da semana; antecedência máxima.
- Conta do cliente: próximos horários, histórico, cancelar, remarcar, agendar de novo, perfil, excluir conta.
- Teste de ponta a ponta do fluxo completo.

**Pronto quando**: o agendamento continua lá depois de recarregar a página e aparece em outro aparelho; dois pedidos simultâneos para o mesmo horário resultam em um aceito e um recusado com mensagem clara; todos os testes de agenda do protótipo passam.

## Fase 4 — Painel do dono, sino e e-mails

- Tela "Hoje" e agenda da semana, com avanço de situação em um toque e histórico de mudanças.
- Bloqueios e folgas: almoço, feriados, férias, bloqueio manual.
- Serviços, categorias e produtos com foto, ordem e destaque.
- Clientes: lista, busca e histórico de cada um.
- Vendas e faturamento bruto com dados reais, com as mesmas funções de hoje e filtro por período.
- Configurações: dados da empresa, funcionamento, regras da agenda.
- Sino em tempo real e histórico de alertas.
- E-mails ao cliente: confirmação, lembrete na véspera, remarcação, cancelamento; preferências no perfil.

**Pronto quando**: cada funcionalidade listada em "O que funciona e será preservado" do diagnóstico existe com dados reais; um agendamento feito num celular acende o sino no painel em segundos; o lembrete chega no dia anterior; um e-mail que falha aparece para o dono.

## Fase 5 — Publicação (versão 1.0)

- Publicação na Cloudflare, no domínio da barbearia; e-mails saindo do domínio próprio.
- Dados reais: endereço, canais, horários, serviços e preços.
- Cópia de segurança semanal automática do banco.
- Monitoramento de erros e de disponibilidade.
- Título, descrição, imagem de compartilhamento, mapa do site e dados de negócio local para buscadores.
- Revisão final de segurança, acessibilidade e desempenho no celular.
- Um ensaio completo com você: agendar como cliente, atender como dono.

**Pronto quando**: você conclui o ensaio sem ajuda e autoriza a divulgação do endereço.

## Fase 6 — Caixa e formas de pagamento

- Forma de pagamento ao concluir um atendimento e ao registrar uma venda: Pix, dinheiro, débito, crédito.
- Atendimento avulso, para o cliente sem hora marcada (se você confirmar a proposta).
- Abertura e fechamento de caixa, com conferência do dinheiro contado.
- Estorno de venda, com registro.
- Financeiro por período e por forma de pagamento.

**Pronto quando**: o fechamento do dia bate com a soma dos lançamentos, e a diferença, quando houver, fica registrada.

## Fase 7 — Descontos e fidelidade

- Cupons: criação pelo dono, uso pelo cliente no agendamento ou aplicação pelo dono no caixa.
- Cartão fidelidade: regra definida pelo dono, saldo visível para o cliente, resgate no atendimento.
- Pacotes de serviços, se o uso real mostrar necessidade.

**Pronto quando**: nenhum desconto ultrapassa o valor do serviço; atendimentos cancelados e faltas não geram ponto; o financeiro mostra o total de descontos concedidos.

## Fase 8 — Refinos

Itens independentes, escolhidos por você conforme a necessidade:

- Relatórios comparativos com gráficos e exportação.
- Instalação do painel na tela inicial do celular do dono.
- Página de avaliações de clientes.
- Fotos próprias da ON-STYLE no lugar das do banco de imagens.

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
