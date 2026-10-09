import { describe, expect, it } from "vitest";
import { abertoAgora, descreverDias, descreverFuncionamento } from "./funcionamento";

const hours = { open: 9, close: 19, days: [1, 2, 3, 4, 5, 6] };
// 8 de outubro de 2026 é quinta-feira; 10 é sábado; 11 é domingo.
const em = (dia: number, hora: number, minuto = 0) => new Date(2026, 9, dia, hora, minuto);

describe("Aberto agora", () => {
  it("está aberto durante o expediente e diz até quando", () => {
    expect(abertoAgora(hours, em(8, 10))).toEqual({
      aberto: true,
      texto: "Aberto agora, até as 19h",
    });
  });
  it("abre exatamente na hora marcada", () => {
    expect(abertoAgora(hours, em(8, 9, 0)).aberto).toBe(true);
  });
  it("fecha exatamente na hora marcada", () => {
    expect(abertoAgora(hours, em(8, 19, 0)).aberto).toBe(false);
    expect(abertoAgora(hours, em(8, 18, 59)).aberto).toBe(true);
  });
  it("antes de abrir, diz que abre hoje", () => {
    expect(abertoAgora(hours, em(8, 8, 30)).texto).toBe("Fechado. Abre hoje às 9h");
  });
  it("depois de fechar, diz que abre amanhã", () => {
    expect(abertoAgora(hours, em(8, 20)).texto).toBe("Fechado. Abre amanhã às 9h");
  });
  it("no domingo fechado, diz que abre amanhã (segunda)", () => {
    expect(abertoAgora(hours, em(11, 12)).texto).toBe("Fechado. Abre amanhã às 9h");
  });
  it("no sábado à noite, pula o domingo e diz o dia da semana", () => {
    expect(abertoAgora({ ...hours, days: [1, 2, 3, 4, 5] }, em(10, 20)).texto).toBe(
      "Fechado. Abre segunda às 9h",
    );
  });
  it("sem nenhum dia de atendimento, fica fechado", () => {
    expect(abertoAgora({ ...hours, days: [] }, em(8, 10))).toEqual({
      aberto: false,
      texto: "Fechado no momento",
    });
  });
});

describe("Descrição do funcionamento", () => {
  it("resume dias seguidos num intervalo", () => {
    expect(descreverDias([1, 2, 3, 4, 5, 6])).toBe("segunda a sábado");
    expect(descreverDias([0, 1, 2, 3])).toBe("domingo a quarta");
  });
  it("junta trechos separados", () => {
    expect(descreverDias([1, 2, 3, 5])).toBe("segunda a quarta e sexta");
    expect(descreverDias([1, 2, 4, 5, 6])).toBe("segunda, terça e quinta a sábado");
  });
  it("trata um dia só e nenhum dia", () => {
    expect(descreverDias([6])).toBe("sábado");
    expect(descreverDias([])).toBe("");
  });
  it("dois dias seguidos não viram intervalo", () => {
    expect(descreverDias([1, 2])).toBe("segunda e terça");
  });
  it("ignora a ordem e repetições", () => {
    expect(descreverDias([6, 1, 1, 2, 3])).toBe("segunda a quarta e sábado");
  });
  it("descreve dias e horas", () => {
    expect(descreverFuncionamento(hours)).toEqual({
      dias: "segunda a sábado",
      horas: "9h às 19h",
    });
  });
});
