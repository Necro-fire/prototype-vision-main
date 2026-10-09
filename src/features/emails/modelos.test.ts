import { describe, expect, it } from "vitest";

import { ehModeloDeEmail, modelosDeEmail, montarEmail, quandoPorExtenso } from "./modelos";

// 12/10/2026 às 09:00 em São Paulo (UTC-3) é 12:00 em UTC.
const dados = {
  cliente_nome: "Maria da Silva",
  servico: "Corte clássico",
  inicio: "2026-10-12T12:00:00Z",
  fuso: "America/Sao_Paulo",
  barbearia: "ON-STYLE",
  endereco: "Rua das Flores, 100",
};
const site = "https://onstyle.example";

describe("quandoPorExtenso", () => {
  it("escreve o dia e a hora no fuso da barbearia, não no do servidor", () => {
    expect(quandoPorExtenso("2026-10-12T12:00:00Z", "America/Sao_Paulo")).toBe(
      "segunda-feira, 12 de outubro, às 09:00",
    );
  });

  it("usa o fuso que recebeu, qualquer que seja o do computador", () => {
    expect(quandoPorExtenso("2026-10-12T12:00:00Z", "Asia/Tokyo")).toBe(
      "segunda-feira, 12 de outubro, às 21:00",
    );
    expect(quandoPorExtenso("2026-10-12T12:00:00Z", "UTC")).toBe(
      "segunda-feira, 12 de outubro, às 12:00",
    );
  });

  it("a hora que passa da meia-noite em UTC continua no dia certo em São Paulo", () => {
    // 01:30 UTC de terça é 22:30 de segunda em São Paulo.
    expect(quandoPorExtenso("2026-10-13T01:30:00Z", "America/Sao_Paulo")).toBe(
      "segunda-feira, 12 de outubro, às 22:30",
    );
  });
});

describe("montarEmail", () => {
  it("confirmação: diz o que foi marcado, quando e onde, e leva à conta", () => {
    const email = montarEmail("confirmacao", dados, site);
    expect(email.assunto).toBe("Agendamento confirmado: segunda-feira, 12 de outubro, às 09:00");
    expect(email.texto).toContain("Olá, Maria.");
    expect(email.texto).toContain("Serviço: Corte clássico");
    expect(email.texto).toContain("Quando: segunda-feira, 12 de outubro, às 09:00");
    expect(email.texto).toContain("Onde: Rua das Flores, 100");
    expect(email.texto).toContain("Ver meus horários: https://onstyle.example/cliente");
    expect(email.html).toContain('href="https://onstyle.example/cliente"');
  });

  it("lembrete: não promete 'amanhã', porque pode sair atrasado", () => {
    const email = montarEmail("lembrete", dados, site);
    expect(email.assunto).toBe("Lembrete do seu horário: segunda-feira, 12 de outubro, às 09:00");
    expect(`${email.assunto} ${email.texto}`).not.toMatch(/amanhã/i);
    expect(email.texto).toContain("Remarcar ou cancelar: https://onstyle.example/cliente");
  });

  it("remarcação: mostra o horário novo e o anterior", () => {
    const email = montarEmail(
      "remarcacao",
      { ...dados, inicio: "2026-10-12T17:00:00Z", inicio_anterior: "2026-10-12T12:00:00Z" },
      site,
    );
    expect(email.assunto).toBe("Agendamento remarcado: segunda-feira, 12 de outubro, às 14:00");
    expect(email.texto).toContain("Quando: segunda-feira, 12 de outubro, às 14:00");
    expect(email.texto).toContain("Antes: segunda-feira, 12 de outubro, às 09:00");
  });

  it("cancelamento: convida a agendar de novo", () => {
    const email = montarEmail("cancelamento", dados, site);
    expect(email.assunto).toBe("Agendamento cancelado: segunda-feira, 12 de outubro, às 09:00");
    expect(email.texto).toContain("foi cancelado");
    expect(email.texto).toContain("Agendar de novo: https://onstyle.example/agendamento");
  });

  it("sem endereço cadastrado, não escreve 'Onde'", () => {
    for (const endereco of [null, undefined, ""]) {
      const email = montarEmail("confirmacao", { ...dados, endereco }, site);
      expect(email.texto).not.toContain("Onde");
      expect(email.html).not.toContain("Onde");
    }
  });

  it("barra no fim do endereço do site não duplica", () => {
    const email = montarEmail("confirmacao", dados, "https://onstyle.example/");
    expect(email.texto).toContain("https://onstyle.example/cliente");
    expect(email.texto).not.toContain("//cliente");
  });

  it("o que a pessoa digitou não vira HTML", () => {
    const email = montarEmail(
      "confirmacao",
      { ...dados, cliente_nome: '<img src=x onerror="alert(1)">', servico: "Corte & barba" },
      site,
    );
    expect(email.html).not.toContain("<img");
    expect(email.html).toContain("Corte &amp; barba");
  });

  it("sem nome, a saudação não fica estranha", () => {
    expect(montarEmail("confirmacao", { ...dados, cliente_nome: "  " }, site).texto).toMatch(
      /^Olá\. /,
    );
  });

  it("dados incompletos viram erro, que o envio registra na fila", () => {
    expect(() => montarEmail("confirmacao", { servico: "Corte" }, site)).toThrow();
  });

  it("todo modelo da fila tem texto", () => {
    for (const modelo of modelosDeEmail) {
      expect(montarEmail(modelo, dados, site).assunto.length).toBeGreaterThan(0);
    }
    expect(ehModeloDeEmail("lembrete")).toBe(true);
    expect(ehModeloDeEmail("promocao")).toBe(false);
  });
});
