import { describe, expect, it } from "vitest";

import {
  agendamentoDeLinha,
  podeAlterar,
  rotuloDaSituacao,
  separarAgendamentos,
  type Agendamento,
  type Situacao,
} from "./agendamentos";

const AGORA = new Date("2026-10-12T15:00:00Z");

function agendamento(
  id: string,
  inicio: string,
  situacao: Situacao = "agendado",
  duracaoMinutos = 30,
): Agendamento {
  const fim = new Date(new Date(inicio).getTime() + duracaoMinutos * 60_000).toISOString();
  return {
    id,
    servicoId: "s1",
    servicoNome: "Corte clássico",
    precoCentavos: 4500,
    duracaoMinutos,
    inicio,
    fim,
    situacao,
    observacao: "",
  };
}

describe("agendamentoDeLinha", () => {
  const linha = {
    id: "a1",
    servico_id: "s1",
    servico_nome: "Corte clássico",
    preco_centavos: 4500,
    duracao_minutos: 30,
    inicio: "2026-10-13T12:00:00+00:00",
    fim: "2026-10-13T12:30:00+00:00",
    situacao: "agendado",
    observacao: "",
    cliente_id: "campo-que-sobra",
  };

  it("converte a linha do banco, em centavos, e ignora o que não usa", () => {
    expect(agendamentoDeLinha(linha)).toEqual({
      id: "a1",
      servicoId: "s1",
      servicoNome: "Corte clássico",
      precoCentavos: 4500,
      duracaoMinutos: 30,
      inicio: "2026-10-13T12:00:00+00:00",
      fim: "2026-10-13T12:30:00+00:00",
      situacao: "agendado",
      observacao: "",
    });
  });

  it("recusa situação que o banco não conhece", () => {
    expect(() => agendamentoDeLinha({ ...linha, situacao: "inventada" })).toThrow();
  });

  it("recusa linha incompleta", () => {
    expect(() => agendamentoDeLinha({ id: "a1" })).toThrow();
  });
});

describe("rotuloDaSituacao", () => {
  it("dá um nome em português para cada situação", () => {
    expect(rotuloDaSituacao("em_atendimento")).toBe("Em atendimento");
    expect(rotuloDaSituacao("nao_compareceu")).toBe("Não compareceu");
    expect(rotuloDaSituacao("concluido")).toBe("Concluído");
  });
});

describe("podeAlterar (regra A10: até o início, sem prazo mínimo)", () => {
  it("agendado e confirmado, antes do início", () => {
    expect(podeAlterar(agendamento("a", "2026-10-12T15:01:00Z"), AGORA)).toBe(true);
    expect(podeAlterar(agendamento("a", "2026-10-12T15:01:00Z", "confirmado"), AGORA)).toBe(true);
  });

  it("não depois de o horário começar", () => {
    expect(podeAlterar(agendamento("a", "2026-10-12T15:00:00Z"), AGORA)).toBe(false);
    expect(podeAlterar(agendamento("a", "2026-10-12T14:00:00Z"), AGORA)).toBe(false);
  });

  it("não nas situações finais nem em atendimento", () => {
    for (const situacao of [
      "concluido",
      "cancelado",
      "nao_compareceu",
      "em_atendimento",
    ] as const) {
      expect(podeAlterar(agendamento("a", "2026-10-13T12:00:00Z", situacao), AGORA)).toBe(false);
    }
  });
});

describe("separarAgendamentos", () => {
  const lista = [
    agendamento("depois", "2026-10-15T12:00:00Z"),
    agendamento("amanha", "2026-10-13T12:00:00Z", "confirmado"),
    agendamento("cancelado-futuro", "2026-10-14T12:00:00Z", "cancelado"),
    agendamento("concluido", "2026-10-01T12:00:00Z", "concluido"),
    agendamento("faltou", "2026-10-05T12:00:00Z", "nao_compareceu"),
    agendamento("em-atendimento", "2026-10-12T14:45:00Z", "em_atendimento"),
  ];

  it("próximos em ordem de data, com o que está em atendimento", () => {
    const { proximos } = separarAgendamentos(lista, AGORA);
    expect(proximos.map((a) => a.id)).toEqual(["em-atendimento", "amanha", "depois"]);
  });

  it("histórico do mais recente para o mais antigo, com cancelados", () => {
    const { historico } = separarAgendamentos(lista, AGORA);
    expect(historico.map((a) => a.id)).toEqual(["cancelado-futuro", "faltou", "concluido"]);
  });

  it("agendado cujo horário já terminou sem ser atendido vai para o histórico", () => {
    const atrasado = agendamento("atrasado", "2026-10-12T13:00:00Z");
    const { proximos, historico } = separarAgendamentos([atrasado], AGORA);
    expect(proximos).toEqual([]);
    expect(historico.map((a) => a.id)).toEqual(["atrasado"]);
  });

  it("lista vazia", () => {
    expect(separarAgendamentos([], AGORA)).toEqual({ proximos: [], historico: [] });
  });
});
