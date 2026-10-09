import { describe, expect, it } from "vitest";

import {
  validarBloqueio,
  validarEmpresa,
  validarFuncionamento,
  validarRegras,
  usuarioDoInstagram,
  type DiaEditavel,
  type FormularioDeBloqueio,
} from "./configuracoes-validacao";

const FUSO = "America/Sao_Paulo"; // UTC-3

const fechado: DiaEditavel = { aberto: false, intervalos: [] };
const dia = (...intervalos: [string, string][]): DiaEditavel => ({
  aberto: true,
  intervalos: intervalos.map(([abre, fecha]) => ({ abre, fecha })),
});

describe("validarFuncionamento", () => {
  it("monta a lista que o banco espera, em ordem, só com os dias abertos", () => {
    const r = validarFuncionamento([
      fechado,
      dia(["14:00", "19:00"], ["09:00", "12:00"]),
      dia(["09:00", "19:00"]),
      fechado,
      fechado,
      fechado,
      dia(["08:00", "13:00"]),
    ]);
    expect(r.valido).toBe(true);
    expect(r.intervalos).toEqual([
      { dia_semana: 1, abre: "09:00", fecha: "12:00" },
      { dia_semana: 1, abre: "14:00", fecha: "19:00" },
      { dia_semana: 2, abre: "09:00", fecha: "19:00" },
      { dia_semana: 6, abre: "08:00", fecha: "13:00" },
    ]);
  });

  it("todos os dias fechados é válido (barbearia fechada)", () => {
    const r = validarFuncionamento(Array.from({ length: 7 }, () => fechado));
    expect(r.valido).toBe(true);
    expect(r.intervalos).toEqual([]);
  });

  it("fechar antes de abrir, ou na mesma hora, é erro do dia", () => {
    const r = validarFuncionamento([
      fechado,
      dia(["19:00", "09:00"]),
      dia(["09:00", "09:00"]),
      fechado,
      fechado,
      fechado,
      fechado,
    ]);
    expect(r.valido).toBe(false);
    expect(r.erros[1]).toBe("O fechamento precisa ser depois da abertura.");
    expect(r.erros[2]).toBe("O fechamento precisa ser depois da abertura.");
    expect(r.erros[0]).toBeUndefined();
  });

  it("intervalos que se sobrepõem, mesmo fora de ordem", () => {
    const r = validarFuncionamento([
      fechado,
      dia(["12:00", "18:00"], ["09:00", "13:00"]),
      fechado,
      fechado,
      fechado,
      fechado,
      fechado,
    ]);
    expect(r.erros[1]).toBe("Os horários do dia se sobrepõem.");
  });

  it("intervalos que apenas encostam são aceitos", () => {
    const r = validarFuncionamento([
      fechado,
      dia(["09:00", "12:00"], ["12:00", "18:00"]),
      fechado,
      fechado,
      fechado,
      fechado,
      fechado,
    ]);
    expect(r.valido).toBe(true);
  });

  it("dia aberto sem horário pede horário ou fechar o dia", () => {
    const r = validarFuncionamento([
      { aberto: true, intervalos: [] },
      fechado,
      fechado,
      fechado,
      fechado,
      fechado,
      fechado,
    ]);
    expect(r.erros[0]).toBe("Informe o horário ou marque o dia como fechado.");
  });

  it("hora fora do formato", () => {
    const r = validarFuncionamento([
      fechado,
      dia(["9:00", "18:00"]),
      dia(["09:00", "25:00"]),
      dia(["09:60", "18:00"]),
      fechado,
      fechado,
      fechado,
    ]);
    expect(r.erros.slice(1, 4)).toEqual([
      "Use horas no formato 09:00.",
      "Use horas no formato 09:00.",
      "Use horas no formato 09:00.",
    ]);
  });
});

describe("validarRegras", () => {
  it("converte para os nomes das colunas", () => {
    expect(validarRegras({ grade: "15", antecedencia: "45", limite: "5" })).toEqual({
      erros: {},
      dados: { grade_minutos: 15, antecedencia_max_dias: 45, max_agendamentos_futuros: 5 },
    });
  });

  it("segue os limites do banco", () => {
    expect(validarRegras({ grade: "25", antecedencia: "0", limite: "21" }).erros).toEqual({
      grade: "Escolha uma das opções.",
      antecedencia: "Use de 1 a 365 dias.",
      limite: "Use de 1 a 20 horários.",
    });
    expect(validarRegras({ grade: "30", antecedencia: "366", limite: "1" }).dados).toBeNull();
    expect(validarRegras({ grade: "30", antecedencia: "365", limite: "20" }).dados).not.toBeNull();
    expect(validarRegras({ grade: "", antecedencia: "x", limite: "-1" }).dados).toBeNull();
  });
});

describe("validarEmpresa", () => {
  const base = { nome: "ON-STYLE", endereco: "", telefone: "", whatsapp: "", instagram: "" };

  it("campo vazio vira nulo no banco, e o texto é aparado", () => {
    expect(
      validarEmpresa({
        ...base,
        endereco: "  Rua das Flores, 10 ",
        telefone: "(11) 91234-5678",
      }).dados,
    ).toEqual({
      nome: "ON-STYLE",
      endereco: "Rua das Flores, 10",
      telefone: "(11) 91234-5678",
      whatsapp: null,
      instagram: null,
    });
  });

  it("exige o nome", () => {
    expect(validarEmpresa({ ...base, nome: " " }).erros.nome).toBe("Informe o nome da barbearia.");
  });

  it("telefone precisa de DDD", () => {
    expect(validarEmpresa({ ...base, telefone: "1234-5678" }).erros.telefone).toBeDefined();
    expect(validarEmpresa({ ...base, whatsapp: "+55 11 91234-5678" }).dados?.whatsapp).toBe(
      "+55 11 91234-5678",
    );
  });

  it("aceita o Instagram em vários formatos e guarda só o usuário", () => {
    for (const entrada of [
      "onstyle",
      "@onstyle",
      "instagram.com/onstyle/",
      "https://www.instagram.com/onstyle?igsh=abc",
    ]) {
      expect(usuarioDoInstagram(entrada), entrada).toBe("onstyle");
      expect(validarEmpresa({ ...base, instagram: entrada }).dados?.instagram).toBe("onstyle");
    }
  });

  it("recusa usuário do Instagram com caracteres inválidos", () => {
    expect(validarEmpresa({ ...base, instagram: "on style!" }).erros.instagram).toBeDefined();
  });
});

describe("validarBloqueio", () => {
  const base: FormularioDeBloqueio = {
    dataInicial: "2026-12-25",
    dataFinal: "",
    diaInteiro: true,
    horaInicial: "",
    horaFinal: "",
    motivo: " Natal ",
  };

  it("dia inteiro: da meia-noite da barbearia até a meia-noite seguinte", () => {
    expect(validarBloqueio(base, FUSO).dados).toEqual({
      inicio: "2026-12-25T03:00:00.000Z",
      fim: "2026-12-26T03:00:00.000Z",
      motivo: "Natal",
    });
  });

  it("férias: vários dias, com o último incluído", () => {
    expect(
      validarBloqueio({ ...base, dataFinal: "2027-01-02", motivo: "Férias" }, FUSO).dados,
    ).toEqual({
      inicio: "2026-12-25T03:00:00.000Z",
      fim: "2027-01-03T03:00:00.000Z",
      motivo: "Férias",
    });
  });

  it("período no meio do dia, no horário da barbearia", () => {
    expect(
      validarBloqueio(
        { ...base, diaInteiro: false, horaInicial: "12:00", horaFinal: "14:00", motivo: "Médico" },
        FUSO,
      ).dados,
    ).toEqual({
      inicio: "2026-12-25T15:00:00.000Z",
      fim: "2026-12-25T17:00:00.000Z",
      motivo: "Médico",
    });
  });

  it("pede a data e, fora do dia inteiro, as horas", () => {
    const semData = validarBloqueio({ ...base, dataInicial: "" }, FUSO);
    expect(semData.erros).toEqual({ dataInicial: "Informe a data." });
    expect(semData.dados).toBeNull();
    const r = validarBloqueio({ ...base, diaInteiro: false }, FUSO);
    expect(r.erros.horaInicial).toBeDefined();
    expect(r.erros.horaFinal).toBeDefined();
  });

  it("o fim não pode ser antes do início", () => {
    expect(validarBloqueio({ ...base, dataFinal: "2026-12-20" }, FUSO).erros.dataFinal).toBe(
      "O fim precisa ser depois do início.",
    );
    expect(
      validarBloqueio(
        { ...base, diaInteiro: false, horaInicial: "14:00", horaFinal: "12:00" },
        FUSO,
      ).dados,
    ).toBeNull();
  });
});
