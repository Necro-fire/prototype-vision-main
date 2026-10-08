# ON-STYLE — Planejamento da evolução

Este é o planejamento para levar o protótipo da barbearia a um sistema real. Nada foi programado nem alterado no código: estes arquivos são a única mudança no projeto. A implementação começa só depois da sua aprovação.

## Como ler

| Documento                                              | O que responde                                                                    |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| [01 — Diagnóstico](01-diagnostico.md)                  | Como o sistema é hoje, o que funciona, o que falha e o que falta                  |
| [02 — Arquitetura desejada](02-arquitetura.md)         | Módulos, páginas, permissões, regras de negócio, banco, autenticação, integrações |
| [03 — Identidade e Design System](03-design-system.md) | Três direções de identidade para escolher, fundamentos visuais e UX de cada área  |
| [04 — Estrutura para o Claude Code](04-claude-code.md) | `CLAUDE.md`, Skills e configurações que serão criados                             |
| [05 — Roadmap](05-roadmap.md)                          | Fases, entregas, critérios de aceite e prioridades                                |

Se for ler só uma coisa, leia a seção "O que preciso de você" abaixo e o [roadmap](05-roadmap.md).

## O diagnóstico em quatro frases

1. O projeto é uma demonstração visual: todos os dados vivem na memória do navegador e somem ao recarregar a página.
2. Por isso o dono nunca vê o agendamento de um cliente — cada pessoa enxerga apenas o que ela mesma criou naquela aba.
3. Não existe segurança real: a senha do administrador está escrita no código enviado ao navegador, e a "conta" do cliente abre com qualquer número de celular.
4. A base tecnológica é boa e será mantida; as regras de agenda já estão isoladas e testadas, e são o que há de mais valioso para preservar.

## Decisões que você já tomou

| Tema              | Decisão                                                               |
| ----------------- | --------------------------------------------------------------------- |
| Escopo            | Uma única barbearia, um barbeiro, agenda única                        |
| Marca             | ON-STYLE, sem identidade pronta; posicionamento de bairro e acessível |
| Perfis            | Dono (acesso total) e cliente com conta                               |
| Login do cliente  | E-mail e senha, ou Google                                             |
| Pagamento         | Só na barbearia, sem cobrança online                                  |
| Notificações      | Alertas dentro do sistema apenas para o dono; o cliente recebe e-mail |
| Produtos          | Vitrine no site e registro de vendas, sem controle de estoque         |
| Financeiro        | Formas de pagamento e caixa; descontos e fidelidade                   |
| Agenda            | Bloqueios e folgas (almoço, feriados, férias, bloqueio manual)        |
| Plataforma        | Sair do Lovable; banco e autenticação no Supabase                     |
| Identidade visual | Nova direção, escolhida entre propostas                               |
| Fotografias       | Banco de imagens reais licenciadas, nunca geradas por IA              |
| Primeira versão   | Núcleo de agendamento; caixa e fidelidade vêm depois                  |
| Prazo             | Sem data fixa                                                         |
| Dados anteriores  | Nenhum; o sistema começa do zero                                      |

## O que preciso de você

### Para aprovar o planejamento

1. **Direção visual**: escolher entre Letreiro, Azulejo e Poste, descritas no [documento de design](03-design-system.md#três-direções-de-identidade). Minha recomendação é Letreiro. Se preferir decidir vendo, a primeira tarefa após a aprovação pode ser uma página comparando as três lado a lado.
2. **Atendimento sem agendamento**: você não incluiu "dono agenda pelo cliente". Proponho que o cliente que chega sem hora marcada seja tratado com um bloqueio manual de horário na primeira versão, e com um "atendimento avulso" na fase do caixa, para a receita dele entrar no fechamento. Confirma?
3. **Proteção contra abuso da agenda**: você não quis controle de faltas, e respeitei. Ainda assim recomendo um limite técnico de três agendamentos futuros por conta, só para impedir que alguém lote a agenda de propósito. Pode ser ajustado ou desligado nas configurações.
4. **Hospedagem**: aprovada a Cloudflare, para onde o projeto já é compilado hoje, no plano gratuito. O domínio já existe na Hostinger e pode continuar lá, apontado para a Cloudflare; os passos ficam para a Fase 5.

### Para a primeira versão ir ao ar

Nada disto bloqueia o início do trabalho, mas tudo é necessário antes da publicação:

- Dados reais da barbearia: endereço, telefone ou WhatsApp, Instagram, horário de funcionamento, serviços com preço e duração.
- O e-mail que será a conta do dono.
- Um domínio (por exemplo `onstyle.com.br`), se já existir ou quando for registrado.
- Contas gratuitas em GitHub, Supabase, Resend, Cloudflare e Google Cloud. Eu indico o passo a passo de cada uma quando chegar a hora; as senhas e chaves ficam com você.
- Se quiser manter as três fotos atuais, baixe-as pelo editor do Lovable antes de desconectar o projeto. Elas estão hospedadas lá e não vieram no ZIP.

## Como aprovar

Responda com o que aprova, o que quer mudar e as quatro respostas acima. Com isso eu ajusto os documentos e começo pela Fase 0 do roadmap, que não altera nada do que o usuário vê.
