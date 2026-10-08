---
name: regras-agenda
description: Use ao mexer em horários disponíveis, duração de serviço, bloqueios, funcionamento da barbearia, situação do agendamento ou qualquer regra de reserva do ON-STYLE.
---

# Regras da agenda

A agenda é o coração do sistema. Uma barbearia, um barbeiro, uma cadeira: um horário só pode ter um cliente.

## Onde fica

- `src/features/agenda/disponibilidade.ts`: `availableTimes` e `today`. **Função pura**, sem estado e sem acesso a rede ou banco.
- `src/features/agenda/disponibilidade.test.ts`: os testes que definem o comportamento.
- `src/features/agenda/tipos.ts`: `Booking`.

Regra nova entra aqui, como função pura com teste. Nunca dentro de componente ou de função de servidor.

## Regras vigentes (já testadas)

1. Só há horários dentro do funcionamento, e o atendimento precisa terminar antes do fechamento.
2. Um horário está ocupado durante toda a duração do serviço que o reservou. Um corte de 60 min às 10:00 bloqueia 09:30 (se o novo durar 60), 10:00 e 10:30.
3. Agendamentos **Cancelado** e **Não compareceu** liberam o horário.
4. Não se agenda no passado nem em dia fechado.
5. Preço, duração e nome do serviço são copiados para o agendamento no momento da reserva. Mudar o serviço depois não altera o que já foi marcado.

## Situações do agendamento

```
Agendado -> Confirmado -> Em atendimento -> Concluído
   |            |
   +------------+--> Cancelado          (antes do início)
   +------------+--> Não compareceu     (depois do horário)
```

Concluído, Cancelado e Não compareceu são finais. Hoje o protótipo aceita qualquer mudança; quando o banco entrar, a transição passa a ser validada (`docs/02-arquitetura.md`, regras A e D6).

## Regras planejadas (ainda não implementadas)

Ver `docs/02-arquitetura.md`, seção "Regras de negócio". As que mais afetam o código:

- Intervalos de funcionamento por dia da semana; o almoço é o espaço entre dois intervalos.
- Bloqueios e folgas retiram períodos da agenda.
- Todos os horários no fuso `America/Sao_Paulo`, nunca no relógio do aparelho.
- O banco recusa dois agendamentos ativos sobrepostos; a verificação da tela é só conforto.
- Grade e antecedência máxima configuráveis. Hoje a grade é fixa em 30 minutos.

## Ao alterar

1. Escreva primeiro o teste que descreve o caso novo.
2. Rode `npm test` e confirme que os testes existentes continuam passando. Se um teste antigo precisa mudar, pare e pergunte: significa mudar uma regra de negócio.
3. Cubra os limites: primeiro e último horário do dia, serviço que acaba exatamente no fechamento, dois agendamentos encostados, dia fechado, hoje com horário que já passou.
4. Não use `new Date()` solto dentro da função nova: receba "agora" como parâmetro para o teste ser determinístico.
