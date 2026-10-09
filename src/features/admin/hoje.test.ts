import { describe, expect, it } from "vitest";

import type { Agendamento, Situacao } from "@/features/agenda/agendamentos";
import { agendamentosDoDia, diasDaSemana, proximoCliente, resumoDoDia, semRegistro } from "./hoje";
import {
  acaoPrincipal,
  proximasSituacoes,
  transicaoPermitida,
  todasAsSituacoes,
} from "./situacoes";

const FUSO = "America/Sao_Paulo"; // UTC-3

// Hora local de São Paulo em 12/10/2026 (segunda-feira), como instante ISO.
const local = (hora: number, minuto = 0, dia = 12) =>
  new Date(Date.UTC(2026, 9, dia, hora + 3, minuto)).toISOString();

function ag(
  id: string,
  inicio: string,
  situacao: Situacao = "agendado",
  precoCentavos = 4500,
  duracaoMinutos = 30,
): Agendamento {
  return {
    id,
    servicoId: "s",
    servicoNome: "Corte",
    precoCentavos,
    descontoCentavos: 0,
    duracaoMinutos,
    inicio,
    fim: new Date(new Date(inicio).getTime() + duracaoMinutos * 60_000).toISOString(),
    situacao,
    observacao: "",
  };
}

describe("agendamentosDoDia", () => {
  it("separa pelo dia no fuso da barbearia, não em UTC, e ordena por horário", () => {
    const lista = [
      ag("tarde", local(15)),
      ag("noite-de-ontem", local(22, 30, 11)), // 01:30 UTC de 12/10, mas ainda é dia 11 em SP
      ag("manha", local(9)),
      ag("amanha", local(9, 0, 13)),
    ];
    expect(agendamentosDoDia(lista, "2026-10-12", FUSO).map((a) => a.id)).toEqual([
      "manha",
      "tarde",
    ]);
    expect(agendamentosDoDia(lista, "2026-10-11", FUSO).map((a) => a.id)).toEqual([
      "noite-de-ontem",
    ]);
  });
});

describe("proximoCliente", () => {
  const dia = [
    ag("passou", local(9), "concluido"),
    ag("em-curso", local(10), "em_atendimento"),
    ag("proximo", local(11), "confirmado"),
    ag("depois", local(14)),
  ];

  it("o atendimento em curso vem primeiro", () => {
    expect(proximoCliente(dia, new Date(local(10, 10)))?.id).toBe("em-curso");
  });

  it("sem nada em curso, o próximo que ainda não terminou", () => {
    const semCurso = dia.filter((a) => a.id !== "em-curso");
    expect(proximoCliente(semCurso, new Date(local(10, 40)))?.id).toBe("proximo");
  });

  it("ignora cancelado, falta e concluído", () => {
    const lista = [
      ag("a", local(13), "cancelado"),
      ag("b", local(14), "nao_compareceu"),
      ag("c", local(15), "concluido"),
    ];
    expect(proximoCliente(lista, new Date(local(9)))).toBeNull();
  });

  it("agendado cujo horário já terminou não é o próximo", () => {
    expect(proximoCliente([ag("atrasado", local(9))], new Date(local(12)))).toBeNull();
  });
});

describe("resumoDoDia com desconto", () => {
  it("previsto e recebido contam o valor cobrado, não o preço de tabela", () => {
    const doDia = [
      { ...ag("a", "2026-10-12T13:00:00Z", "concluido", 4500), descontoCentavos: 450 },
      { ...ag("b", "2026-10-12T14:00:00Z", "agendado", 7000), descontoCentavos: 1000 },
    ];
    const r = resumoDoDia(doDia);
    expect(r.recebidoCentavos).toBe(4050);
    expect(r.previstoCentavos).toBe(4050 + 6000);
  });
});

describe("resumoDoDia", () => {
  it("conta o movimento, o previsto e o que já foi atendido", () => {
    const dia = [
      ag("1", local(9), "concluido", 4500),
      ag("2", local(10), "confirmado", 7000),
      ag("3", local(11), "cancelado", 3000),
      ag("4", local(12), "nao_compareceu", 3500),
      ag("5", local(14), "agendado", 1500),
    ];
    expect(resumoDoDia(dia)).toEqual({
      marcados: 3,
      concluidos: 1,
      faltas: 1,
      cancelados: 1,
      previstoCentavos: 13000,
      recebidoCentavos: 4500,
    });
  });

  it("dia vazio", () => {
    expect(resumoDoDia([])).toEqual({
      marcados: 0,
      concluidos: 0,
      faltas: 0,
      cancelados: 0,
      previstoCentavos: 0,
      recebidoCentavos: 0,
    });
  });
});

describe("diasDaSemana", () => {
  it("vai de segunda a domingo, a partir de qualquer dia da semana", () => {
    const esperado = [
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
    ];
    expect(diasDaSemana("2026-10-12")).toEqual(esperado); // segunda
    expect(diasDaSemana("2026-10-15")).toEqual(esperado); // quinta
    expect(diasDaSemana("2026-10-18")).toEqual(esperado); // domingo
  });

  it("atravessa a virada do mês", () => {
    expect(diasDaSemana("2026-10-29")[0]).toBe("2026-10-26");
    expect(diasDaSemana("2026-10-29")[6]).toBe("2026-11-01");
  });
});

describe("semRegistro", () => {
  it("agendado ou confirmado que já terminou e ficou sem situação", () => {
    const lista = [
      ag("a", local(9)),
      ag("b", local(9, 30), "confirmado"),
      ag("c", local(9), "concluido"),
      ag("d", local(13)),
    ];
    expect(semRegistro(lista, new Date(local(11))).map((a) => a.id)).toEqual(["a", "b"]);
  });
});

describe("situações do agendamento", () => {
  it("o caminho feliz: agendado, confirmado, em atendimento, concluído", () => {
    expect(acaoPrincipal("agendado")).toBe("confirmado");
    expect(acaoPrincipal("confirmado")).toBe("em_atendimento");
    expect(acaoPrincipal("em_atendimento")).toBe("concluido");
  });

  it("situação final não tem próximo passo", () => {
    for (const final of ["concluido", "cancelado", "nao_compareceu"] as const) {
      expect(acaoPrincipal(final)).toBeNull();
      expect(proximasSituacoes(final, local(9), new Date(local(10)))).toEqual([]);
    }
  });

  it("'não compareceu' só aparece depois do início do horário", () => {
    const inicio = local(10);
    expect(proximasSituacoes("confirmado", inicio, new Date(local(9, 59)))).toEqual([
      "em_atendimento",
      "cancelado",
    ]);
    expect(proximasSituacoes("confirmado", inicio, new Date(local(10)))).toEqual([
      "em_atendimento",
      "cancelado",
      "nao_compareceu",
    ]);
  });

  it("em atendimento só pode ser concluído", () => {
    expect(proximasSituacoes("em_atendimento", local(9), new Date(local(10)))).toEqual([
      "concluido",
    ]);
  });

  it("transicaoPermitida cobre todos os pares", () => {
    const permitidos = todasAsSituacoes.flatMap((de) =>
      todasAsSituacoes
        .filter((para) => transicaoPermitida(de, para))
        .map((para) => `${de}>${para}`),
    );
    expect(permitidos).toEqual([
      "agendado>confirmado",
      "agendado>em_atendimento",
      "agendado>cancelado",
      "agendado>nao_compareceu",
      "confirmado>em_atendimento",
      "confirmado>cancelado",
      "confirmado>nao_compareceu",
      "em_atendimento>concluido",
    ]);
  });
});
