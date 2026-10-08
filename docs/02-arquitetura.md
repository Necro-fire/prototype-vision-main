# 02 — Arquitetura desejada

## Princípios

1. **Paridade primeiro**: tudo o que funciona no protótipo continua funcionando ao fim de cada fase.
2. **A segurança mora no banco**: quem pode ler ou alterar cada linha é decidido por regras do próprio banco, não pela tela. Uma tela com defeito não consegue vazar dados.
3. **Regras de negócio em funções puras e testadas**, como já acontece com o cálculo de horários.
4. **Tamanho certo**: uma barbearia, um barbeiro, dois perfis. Nada de estruturas para várias unidades ou equipes que ninguém pediu.
5. **Celular primeiro**, tanto para o cliente quanto para o dono.

## Visão técnica

```
Navegador (cliente ou dono)
        │
        ▼
Aplicação TanStack Start ── publicada na Cloudflare
  ├─ páginas renderizadas no servidor
  └─ funções de servidor (validam a entrada, leem a sessão)
        │
        ▼
Supabase
  ├─ Postgres ....... dados + regras de acesso por linha (RLS)
  ├─ Auth ........... e-mail e senha, Google
  ├─ Storage ........ fotos de serviços e produtos
  ├─ Realtime ....... sino de alertas do dono
  └─ Função agendada  envia os e-mails da fila ──► Resend
```

### O que fica, o que sai, o que entra

|       | Tecnologia                                                                                    | Motivo                                                      |
| ----- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Fica  | TanStack Start, React 19, Tailwind 4, shadcn/ui, Vitest                                       | Base moderna e já em uso; trocar seria retrabalho sem ganho |
| Fica  | React Query, React Hook Form, Zod, react-day-picker                                           | Já instalados; passam a ser usados de fato                  |
| Sai   | Preset `@lovable.dev/vite-tanstack-config`, relatório de erros do Lovable, fotos em `/__l5e/` | Decisão de sair do Lovable                                  |
| Sai   | Componentes shadcn e bibliotecas sem uso                                                      | Menos código para manter                                    |
| Entra | Supabase                                                                                      | Banco, login e regras de acesso prontos, plano gratuito     |
| Entra | Resend                                                                                        | Envio de e-mails transacionais, plano gratuito              |
| Entra | GitHub + GitHub Actions                                                                       | Histórico do código e verificação automática a cada mudança |
| Entra | Playwright                                                                                    | Teste de ponta a ponta do fluxo de agendamento              |
| Entra | npm como gerenciador de pacotes                                                               | Já está instalado; o Bun não                                |

### Organização do código

```
src/
  routes/            páginas: só carregam dados e montam a tela
  features/
    agenda/          disponibilidade (função pura), reserva, bloqueios
    catalogo/        serviços, categorias, produtos
    clientes/
    vendas/          vendas, caixa, formas de pagamento
    fidelidade/      cupons e cartão fidelidade
    alertas/         sino do dono e fila de e-mails
    empresa/         dados e horários da barbearia
    conta/           login, cadastro, perfil
  components/
    ui/              componentes base do Design System
    layout/          estrutura do site e do painel
  lib/               supabase, dinheiro, datas, telefone, ambiente
  styles/            tokens e base
supabase/
  migrations/        cada mudança do banco, em ordem
  functions/         envio de e-mails
  seed.sql           dados iniciais
tests/               testes de ponta a ponta
docs/
.claude/             instruções e Skills do Claude Code
```

Cada pasta de `features/` tem a mesma forma: esquemas de validação, funções de servidor, consultas, componentes e testes. Os dois arquivos gigantes de hoje se dividem por essas pastas.

### Ambientes

| Ambiente        | Aplicação                           | Banco                           |
| --------------- | ----------------------------------- | ------------------------------- |
| Desenvolvimento | Seu computador                      | Projeto Supabase `onstyle-dev`  |
| Produção        | Cloudflare, no domínio da barbearia | Projeto Supabase `onstyle-prod` |

O plano gratuito do Supabase permite dois projetos. As mudanças de banco são sempre escritas como migrações, testadas em desenvolvimento e só então aplicadas em produção.

## Perfis e permissões

| Recurso                                           | Visitante  | Cliente                                     | Dono                    |
| ------------------------------------------------- | ---------- | ------------------------------------------- | ----------------------- |
| Serviços, produtos, horários e dados da barbearia | Ver ativos | Ver ativos                                  | Tudo                    |
| Horários livres de um dia                         | Ver        | Ver                                         | Ver                     |
| Agendamentos                                      | —          | Criar, ver, remarcar e cancelar os **seus** | Tudo                    |
| Perfil                                            | —          | Ver e editar o **seu**; excluir a conta     | Ver todos               |
| Bloqueios e folgas                                | —          | —                                           | Tudo                    |
| Vendas, caixa, financeiro                         | —          | —                                           | Tudo                    |
| Cupons                                            | —          | Usar um código válido                       | Tudo                    |
| Cartão fidelidade                                 | —          | Ver o **seu** saldo                         | Tudo                    |
| Alertas do sistema                                | —          | —                                           | Ver e marcar como lidos |
| Configurações                                     | —          | —                                           | Tudo                    |

Três barreiras garantem a tabela acima: a regra no banco (a que vale), a verificação de perfil no servidor antes de abrir qualquer página de `/admin` ou `/cliente`, e a interface, que nem mostra o que o perfil não pode usar.

O perfil de dono é atribuído uma única vez, direto no banco. Nenhuma tela permite que alguém se promova.

## Páginas e navegação

Os endereços atuais são mantidos. Itens marcados com a fase em que entram; sem marca, entram na primeira versão.

**Área pública**

| Rota                      | Conteúdo                                                                        |
| ------------------------- | ------------------------------------------------------------------------------- |
| `/`                       | Aberto ou fechado agora, serviços com preço, próximo horário livre, como chegar |
| `/servicos`               | Catálogo por categoria                                                          |
| `/produtos`               | Vitrine                                                                         |
| `/contato`                | Endereço, mapa, canais, horários                                                |
| `/agendamento`            | Serviço → dia e horário → confirmar                                             |
| `/privacidade`, `/termos` | Textos legais                                                                   |

**Conta**

| Rota                                   | Conteúdo                 |
| -------------------------------------- | ------------------------ |
| `/entrar`, `/criar-conta`              | E-mail e senha ou Google |
| `/recuperar-senha`, `/redefinir-senha` | Recuperação por e-mail   |

**Cliente** (exige login)

| Rota                  | Conteúdo                                                           |
| --------------------- | ------------------------------------------------------------------ |
| `/cliente`            | Próximos horários e histórico; remarcar, cancelar, agendar de novo |
| `/cliente/perfil`     | Nome, celular, preferências de e-mail, excluir conta               |
| `/cliente/fidelidade` | Cartão fidelidade (fase 7)                                         |

**Painel do dono** (exige login com perfil de dono)

| Rota                                     | Conteúdo                                                    |
| ---------------------------------------- | ----------------------------------------------------------- |
| `/admin`                                 | Hoje: linha do tempo do dia, próximo cliente, ações rápidas |
| `/admin/agendamentos`                    | Agenda por semana e lista com busca e filtros; bloqueios    |
| `/admin/servicos`, `/admin/produtos`     | Catálogo                                                    |
| `/admin/clientes`, `/admin/clientes/$id` | Lista e histórico de cada cliente                           |
| `/admin/vendas`                          | Registro e histórico de vendas                              |
| `/admin/financeiro`                      | Faturamento por período                                     |
| `/admin/caixa`                           | Abertura, fechamento e conferência (fase 6)                 |
| `/admin/descontos`                       | Cupons e regra de fidelidade (fase 7)                       |
| `/admin/alertas`                         | Histórico do sino                                           |
| `/admin/configuracoes`                   | Empresa, horários, e-mails, regras da agenda                |

O endereço único `/admin/$module` dá lugar a um arquivo de rota por módulo. Os endereços que o usuário vê não mudam.

### Fluxos principais

**Agendar (cliente)**

1. Escolhe o serviço. Vindo do catálogo, este passo já chega preenchido.
2. Escolhe o dia numa faixa de dias e o horário numa grade; dias sem vaga aparecem desabilitados.
3. Se não estiver logado, entra ou cria conta. A escolha feita é mantida durante o login.
4. Revisa e confirma. O servidor verifica o horário de novo e grava.
5. Vê a confirmação, com opção de adicionar à agenda do celular, e recebe o e-mail.

O login fica no fim de propósito: o cliente só é interrompido quando já decidiu.

**Dia de trabalho (dono)**

1. Abre o painel no celular e vê a linha do tempo de hoje.
2. Um novo agendamento ou cancelamento acende o sino na hora.
3. Para cada cliente, um toque avança a situação: confirmar, iniciar, concluir.
4. Precisa sair? Bloqueia o intervalo em dois toques.

## Regras de negócio

### Agenda

| #   | Regra                                                                                                                                        | Origem            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| A1  | Só existem horários dentro do funcionamento, e o atendimento precisa terminar antes do fechamento                                            | Protótipo         |
| A2  | Um horário está ocupado durante toda a duração do serviço que o reservou                                                                     | Protótipo         |
| A3  | Agendamentos cancelados ou marcados como falta liberam o horário                                                                             | Protótipo         |
| A4  | Não se agenda no passado nem em dia fechado                                                                                                  | Protótipo         |
| A5  | Cada dia da semana pode ter um ou mais intervalos de funcionamento; o almoço é o espaço entre dois intervalos                                | Nova              |
| A6  | Bloqueios (feriado, férias, saída) tiram um período da agenda; não se cria bloqueio sobre agendamento ativo sem antes resolver o agendamento | Nova              |
| A7  | Todos os horários são calculados no fuso da barbearia (`America/Sao_Paulo`), nunca no relógio do aparelho                                    | Nova              |
| A8  | O banco recusa dois agendamentos ativos sobrepostos, mesmo que cheguem no mesmo instante                                                     | Nova              |
| A9  | O intervalo da grade (30 min por padrão) e a antecedência máxima (30 dias por padrão) são configuráveis                                      | Nova              |
| A10 | O cliente pode cancelar ou remarcar até o início do horário; não há prazo mínimo                                                             | Sua decisão       |
| A11 | Limite técnico de agendamentos futuros por conta, contra abuso                                                                               | Proposta pendente |

### Situação do agendamento

```
Agendado ──► Confirmado ──► Em atendimento ──► Concluído
    │             │
    ├─────────────┴──► Cancelado         (cliente ou dono, antes do início)
    └─────────────┴──► Não compareceu    (dono, depois do horário)
```

Concluído, Cancelado e Não compareceu são finais. O dono pode corrigir um engano no mesmo dia, e toda mudança fica registrada com autor e hora.

### Catálogo, clientes e dinheiro

| #   | Regra                                                                                                                          | Origem    |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | --------- |
| C1  | Preço, duração e nome do serviço são copiados para o agendamento no momento da reserva                                         | Protótipo |
| C2  | Serviço ou produto inativo some do site, mas permanece no histórico                                                            | Protótipo |
| C3  | Serviço ou produto com histórico não é apagado, só desativado                                                                  | Nova      |
| C4  | O "mais pedido" é calculado pelos atendimentos concluídos ou marcado pelo dono, nunca fixo no código                           | Nova      |
| P1  | A identidade do cliente é a conta com e-mail verificado; o celular é um dado de contato, normalizado como hoje                 | Nova      |
| P2  | Para agendar é preciso ter o e-mail confirmado, nome e celular                                                                 | Nova      |
| F1  | Valores são guardados em centavos inteiros                                                                                     | Nova      |
| F2  | Faturamento bruto = atendimentos concluídos + vendas de produtos                                                               | Protótipo |
| F3  | Venda não é apagada; é estornada, e o estorno fica no histórico                                                                | Nova      |
| F4  | Concluir um atendimento pede a forma de pagamento: Pix, dinheiro, débito ou crédito                                            | Fase 6    |
| F5  | O caixa do dia é aberto com um valor inicial e fechado com conferência do dinheiro contado                                     | Fase 6    |
| F6  | Um cupom tem validade, limite de usos e desconto em percentual ou valor fixo; o desconto nunca passa do total                  | Fase 7    |
| F7  | Cartão fidelidade: a cada N atendimentos concluídos, um serviço escolhido pelo dono sai grátis; cancelados e faltas não contam | Fase 7    |

## Banco de dados

Todas as tabelas têm regras de acesso por linha ativas e começam fechadas: sem uma regra explícita, ninguém lê nem grava.

### Primeira versão

| Tabela                | Guarda                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| `perfis`              | Uma linha por conta: nome, celular, perfil (`dono` ou `cliente`), preferências de e-mail           |
| `empresa`             | Linha única: nome, endereço, telefone, redes, fuso, intervalo da grade, antecedência máxima        |
| `funcionamento`       | Intervalos de funcionamento por dia da semana                                                      |
| `bloqueios`           | Períodos indisponíveis, com motivo                                                                 |
| `categorias`          | Categorias de serviço, com ordem                                                                   |
| `servicos`            | Nome, descrição, preço em centavos, duração, ativo, destaque, foto                                 |
| `produtos`            | Nome, descrição, preço em centavos, ativo, foto                                                    |
| `agendamentos`        | Cliente, serviço, cópia de nome/preço/duração, início e fim com fuso, situação, observação         |
| `agendamento_eventos` | Histórico de mudanças de situação: de, para, quem, quando                                          |
| `vendas`              | Cabeçalho da venda: cliente opcional, total, data; já prevê forma de pagamento, desconto e estorno |
| `venda_itens`         | Produto, cópia de nome e preço, quantidade                                                         |
| `alertas`             | Avisos do sino do dono: tipo, texto, agendamento relacionado, lido em                              |
| `emails_fila`         | E-mails a enviar: destinatário, modelo, dados, enviar a partir de, enviado em, erro                |

### Fases seguintes

| Tabela                  | Fase | Guarda                                                                |
| ----------------------- | ---- | --------------------------------------------------------------------- |
| `caixas`                | 6    | Abertura, valor inicial, fechamento, valor contado, diferença         |
| `cupons`                | 7    | Código, tipo e valor do desconto, validade, limite e contagem de usos |
| `fidelidade_movimentos` | 7    | Pontos ganhos e resgatados por cliente; o saldo é a soma              |

### Três mecanismos que resolvem as falhas mais graves

- **Reserva atômica**: agendar é uma única operação no banco, que confere a disponibilidade e grava dentro da mesma transação. Uma restrição de exclusão sobre o intervalo de tempo impede sobreposição mesmo com dois pedidos simultâneos (falha D3).
- **Disponibilidade sem expor ninguém**: o site consulta apenas os períodos ocupados de um dia, sem nomes nem serviços. A função pura `availableTimes`, com seus testes, continua sendo quem transforma isso em horários livres (falhas S3 e S4).
- **Tudo com fuso**: início e fim do agendamento são gravados como instante absoluto e exibidos no fuso da barbearia (falha D4).

## Autenticação e segurança

| Tema                | Medida                                                                                                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login do cliente    | E-mail e senha com confirmação de e-mail, ou Google; recuperação de senha por e-mail                                                                                                                                |
| Login do dono       | A mesma tela; o perfil de dono leva ao painel. As credenciais demonstrativas são removidas                                                                                                                          |
| Sessão              | Cookie seguro lido no servidor; páginas protegidas verificam a sessão antes de renderizar                                                                                                                           |
| Entradas            | Toda função de servidor valida os dados com esquema antes de usá-los                                                                                                                                                |
| Chaves              | A chave administrativa do Supabase existe apenas no envio de e-mails, nunca no navegador; `.env` passa a ser ignorado pelo git                                                                                      |
| Abuso               | Limites de tentativas do próprio Supabase no login; verificação anti-robô no cadastro, se necessário                                                                                                                |
| Cabeçalhos          | Política de segurança de conteúdo e demais cabeçalhos de proteção                                                                                                                                                   |
| LGPD                | Política de privacidade, aceite no cadastro, coleta mínima (nome, e-mail, celular), exclusão de conta pelo próprio cliente                                                                                          |
| Auditoria           | Mudanças de situação e estornos registram autor e hora                                                                                                                                                              |
| Cópias de segurança | Exportação semanal automática do banco de produção. O plano gratuito do Supabase tem limites de backup e pausa projetos sem uso; confirmo os limites atuais ao criar o projeto e aviso se valer a pena o plano pago |

## Integrações

| Serviço      | Uso                                     | Custo esperado                       |
| ------------ | --------------------------------------- | ------------------------------------ |
| Supabase     | Banco, login, arquivos, tempo real      | Gratuito no porte de uma barbearia   |
| Google Cloud | Apenas para o botão "Entrar com Google" | Gratuito                             |
| Resend       | E-mails do sistema e do login           | Gratuito no volume esperado          |
| Cloudflare   | Hospedagem e domínio                    | Gratuito, fora o registro do domínio |
| GitHub       | Código e verificação automática         | Gratuito                             |

Os valores dos planos mudam; confirmo cada um no momento da criação das contas.

### Avisos

**Sino do dono**, em tempo real: novo agendamento, cancelamento ou remarcação feita pelo cliente, e cliente que não foi marcado como atendido depois do horário.

**E-mails ao cliente**: confirmação de conta, recuperação de senha, agendamento confirmado, lembrete na véspera, agendamento remarcado, agendamento cancelado (por ele ou pelo dono).

Os e-mails saem de uma fila gravada no banco. Se o envio falhar, o sistema tenta de novo e o erro fica visível para o dono, em vez de o aviso se perder em silêncio. O cliente pode desligar os lembretes no perfil; os e-mails de conta e de confirmação são sempre enviados.

## Qualidade

| Tipo                   | Cobre                                                                       |
| ---------------------- | --------------------------------------------------------------------------- |
| Testes de unidade      | Disponibilidade, situações do agendamento, dinheiro, cupons, fidelidade     |
| Testes de permissão    | Cada linha da tabela de perfis, executada contra o banco de desenvolvimento |
| Teste de ponta a ponta | Criar conta, agendar, cancelar; dono confirma e conclui                     |
| Verificação automática | Formatação, tipos, testes e compilação a cada envio ao GitHub               |
| Acessibilidade         | Navegação por teclado, contraste e leitores de tela nas telas principais    |
