import { describe, expect, it, vi } from "vitest";

import {
  enviarPeloResend,
  lerConfiguracao,
  responderAoAgendador,
  segredoConfere,
  type ConfiguracaoDeEmails,
} from "./emails";

const ambiente = {
  VITE_SUPABASE_URL: "https://projeto.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "chave-de-servico",
  RESEND_API_KEY: "re_chave",
  EMAIL_REMETENTE: "ON-STYLE <oi@onstyle.example>",
  VITE_SITE_URL: "https://onstyle.example",
  CRON_SECRET: "segredo-do-agendador",
};
const pedido = (autorizacao?: string) =>
  new Request("https://onstyle.example/api/emails/processar", {
    method: "POST",
    headers: autorizacao ? { authorization: autorizacao } : {},
  });

describe("lerConfiguracao", () => {
  it("com tudo no ambiente, devolve a configuração", () => {
    expect(lerConfiguracao(ambiente)).toEqual({
      ok: true,
      configuracao: {
        supabaseUrl: "https://projeto.supabase.co",
        chaveDeServico: "chave-de-servico",
        chaveDoResend: "re_chave",
        remetente: "ON-STYLE <oi@onstyle.example>",
        urlDoSite: "https://onstyle.example",
      },
    });
  });

  it("diz pelo nome o que falta, sem repetir valor nenhum", () => {
    const resultado = lerConfiguracao({ VITE_SUPABASE_URL: ambiente.VITE_SUPABASE_URL });
    expect(resultado).toEqual({
      ok: false,
      faltam: ["SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY", "EMAIL_REMETENTE", "VITE_SITE_URL"],
    });
  });
});

describe("enviarPeloResend", () => {
  const configuracao = { chaveDoResend: "re_chave", remetente: "ON-STYLE <oi@onstyle.example>" };
  const email = { para: "maria@exemplo.com", assunto: "Oi", texto: "texto", html: "<p>html</p>" };

  it("manda o e-mail com a chave, o remetente e a chave de idempotência", async () => {
    const buscar = vi.fn(async () => new Response('{"id":"x"}', { status: 200 }));
    await enviarPeloResend(configuracao, email, "id-1", buscar as unknown as typeof fetch);
    const [url, init] = buscar.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer re_chave",
      "Idempotency-Key": "id-1",
    });
    expect(JSON.parse(init.body as string)).toEqual({
      from: "ON-STYLE <oi@onstyle.example>",
      to: ["maria@exemplo.com"],
      subject: "Oi",
      text: "texto",
      html: "<p>html</p>",
    });
  });

  it("recusa do Resend vira erro com o motivo (que fica gravado na fila)", async () => {
    const buscar = vi.fn(
      async () => new Response('{"message":"The domain is not verified"}', { status: 403 }),
    );
    await expect(
      enviarPeloResend(configuracao, email, "id-1", buscar as unknown as typeof fetch),
    ).rejects.toThrow("Resend 403: The domain is not verified");
  });

  it("resposta sem corpo legível também é erro, com o status", async () => {
    const buscar = vi.fn(async () => new Response("<html>", { status: 502 }));
    await expect(
      enviarPeloResend(configuracao, email, "id-1", buscar as unknown as typeof fetch),
    ).rejects.toThrow("Resend 502: sem detalhes");
  });
});

describe("segredoConfere", () => {
  it("só aceita o segredo exato", () => {
    expect(segredoConfere("abc", "abc")).toBe(true);
    expect(segredoConfere("abd", "abc")).toBe(false);
    expect(segredoConfere("ab", "abc")).toBe(false);
    // Começa igual, mas é maior: também não vale.
    expect(segredoConfere("abcd", "abc")).toBe(false);
    expect(segredoConfere(null, "abc")).toBe(false);
    expect(segredoConfere("", "abc")).toBe(false);
  });
});

describe("responderAoAgendador", () => {
  const processar = vi.fn(async (_: ConfiguracaoDeEmails) => ({
    reservados: 2,
    enviados: 1,
    falhas: 1,
  }));

  it("com o segredo certo, esvazia a fila e devolve a contagem", async () => {
    processar.mockClear();
    const resposta = await responderAoAgendador(
      pedido("Bearer segredo-do-agendador"),
      ambiente,
      processar,
    );
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ reservados: 2, enviados: 1, falhas: 1 });
    expect(processar).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["sem cabeçalho", undefined],
    ["segredo errado", "Bearer outro"],
    ["sem Bearer", "segredo-errado-mesmo"],
  ])("%s: 401 e a fila nem é tocada", async (_nome, autorizacao) => {
    processar.mockClear();
    const resposta = await responderAoAgendador(pedido(autorizacao), ambiente, processar);
    expect(resposta.status).toBe(401);
    expect(processar).not.toHaveBeenCalled();
  });

  it("sem CRON_SECRET configurado, recusa tudo (nunca fica aberta)", async () => {
    processar.mockClear();
    const { CRON_SECRET: _, ...semSegredo } = ambiente;
    const resposta = await responderAoAgendador(pedido("Bearer "), semSegredo, processar);
    expect(resposta.status).toBe(503);
    expect(processar).not.toHaveBeenCalled();
  });

  it("configuração incompleta: 503 com o nome do que falta e nenhum valor", async () => {
    const { RESEND_API_KEY: _, ...semResend } = ambiente;
    const resposta = await responderAoAgendador(
      pedido("Bearer segredo-do-agendador"),
      semResend,
      processar,
    );
    expect(resposta.status).toBe(503);
    const texto = await resposta.text();
    expect(texto).toContain("RESEND_API_KEY");
    expect(texto).not.toContain("chave-de-servico");
  });

  it("falha ao processar: 500 sem vazar o motivo", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const resposta = await responderAoAgendador(
      pedido("Bearer segredo-do-agendador"),
      ambiente,
      async () => {
        throw new Error("senha do banco: 123");
      },
    );
    expect(resposta.status).toBe(500);
    expect(await resposta.text()).not.toContain("123");
    erro.mockRestore();
  });
});
