import { describe, expect, it, vi } from "vitest";

import { processarFila, type EmailDaFila, type PortasDaFila } from "./processar-fila";

const dados = {
  cliente_nome: "Maria",
  servico: "Corte clássico",
  inicio: "2026-10-12T12:00:00Z",
  fuso: "America/Sao_Paulo",
  barbearia: "ON-STYLE",
};
const email = (id: string, modelo = "confirmacao"): EmailDaFila => ({
  id,
  destinatario: `${id}@exemplo.com`,
  modelo,
  dados,
});

function portas(fila: EmailDaFila[], aoEnviar?: (id: string) => void) {
  const registro = { enviados: [] as string[], falhas: [] as [string, string][] };
  const p: PortasDaFila = {
    reservar: vi.fn(async () => fila),
    enviar: vi.fn(async (pronto, idempotencia) => {
      aoEnviar?.(idempotencia);
      registro.enviados.push(pronto.para);
    }),
    marcarEnviado: vi.fn(async () => {}),
    marcarFalha: vi.fn(async (id, erro) => void registro.falhas.push([id, erro])),
  };
  return { p, registro };
}

const opcoes = { urlDoSite: "https://onstyle.example" };

describe("processarFila", () => {
  it("envia cada e-mail para o destinatário certo e marca como enviado", async () => {
    const { p, registro } = portas([email("a"), email("b", "lembrete")]);
    const resultado = await processarFila(p, opcoes);
    expect(resultado).toEqual({ reservados: 2, enviados: 2, falhas: 0 });
    expect(registro.enviados).toEqual(["a@exemplo.com", "b@exemplo.com"]);
    expect(p.marcarEnviado).toHaveBeenCalledTimes(2);
    expect(p.marcarEnviado).toHaveBeenCalledWith("a");
    expect(p.marcarFalha).not.toHaveBeenCalled();
  });

  it("usa o id do e-mail como chave de idempotência, para não enviar em dobro", async () => {
    const chaves: string[] = [];
    const { p } = portas([email("a")], (chave) => chaves.push(chave));
    await processarFila(p, opcoes);
    expect(chaves).toEqual(["a"]);
  });

  it("pede ao banco só o limite combinado", async () => {
    const { p } = portas([]);
    await processarFila(p, { ...opcoes, limite: 3 });
    expect(p.reservar).toHaveBeenCalledWith(3);
  });

  it("fila vazia não faz nada", async () => {
    const { p } = portas([]);
    expect(await processarFila(p, opcoes)).toEqual({ reservados: 0, enviados: 0, falhas: 0 });
    expect(p.enviar).not.toHaveBeenCalled();
  });

  it("uma falha de envio é registrada e não impede os outros", async () => {
    const { p, registro } = portas([email("a"), email("b"), email("c")]);
    vi.mocked(p.enviar).mockImplementationOnce(async () => {
      throw new Error("Resend 429: Too many requests");
    });
    const resultado = await processarFila(p, opcoes);
    expect(resultado).toEqual({ reservados: 3, enviados: 2, falhas: 1 });
    expect(registro.falhas).toEqual([["a", "Resend 429: Too many requests"]]);
    expect(p.marcarEnviado).not.toHaveBeenCalledWith("a");
    expect(p.marcarEnviado).toHaveBeenCalledWith("b");
    expect(p.marcarEnviado).toHaveBeenCalledWith("c");
  });

  it("modelo desconhecido e dados quebrados são falha registrada, sem enviar nada", async () => {
    const quebrado: EmailDaFila = {
      id: "q",
      destinatario: "q@exemplo.com",
      modelo: "confirmacao",
      dados: {},
    };
    const { p, registro } = portas([email("x", "promocao"), quebrado]);
    const resultado = await processarFila(p, opcoes);
    expect(resultado).toEqual({ reservados: 2, enviados: 0, falhas: 2 });
    expect(p.enviar).not.toHaveBeenCalled();
    expect(registro.falhas[0]).toEqual(["x", "Modelo desconhecido: promocao"]);
    expect(registro.falhas[1]?.[0]).toBe("q");
  });

  it("o e-mail sai com assunto e texto montados a partir do que o banco gravou", async () => {
    const { p } = portas([email("a")]);
    await processarFila(p, opcoes);
    const [pronto] = vi.mocked(p.enviar).mock.calls[0]!;
    expect(pronto.para).toBe("a@exemplo.com");
    expect(pronto.assunto).toBe("Agendamento confirmado: segunda-feira, 12 de outubro, às 09:00");
    expect(pronto.texto).toContain("https://onstyle.example/cliente");
  });

  it("se o banco falha ao reservar, o erro sobe (nada foi enviado)", async () => {
    const { p } = portas([]);
    vi.mocked(p.reservar).mockRejectedValueOnce(new Error("emails_reservar: sem rede"));
    await expect(processarFila(p, opcoes)).rejects.toThrow("sem rede");
    expect(p.enviar).not.toHaveBeenCalled();
  });
});
