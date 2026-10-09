// Texto dos e-mails ao cliente. Função pura: recebe o que o banco gravou em `emails_fila.dados`
// e devolve assunto, texto simples e HTML. Quem envia está em `processar-fila.ts`.
import { z } from "zod";

export const modelosDeEmail = ["confirmacao", "lembrete", "remarcacao", "cancelamento"] as const;
export type ModeloDeEmail = (typeof modelosDeEmail)[number];

const dadosDoEmail = z.object({
  cliente_nome: z.string(),
  servico: z.string(),
  inicio: z.string(),
  inicio_anterior: z.string().optional(),
  fuso: z.string(),
  barbearia: z.string(),
  endereco: z.string().nullish(),
});
export type DadosDoEmail = z.infer<typeof dadosDoEmail>;

export type EmailMontado = { assunto: string; texto: string; html: string };

export const ehModeloDeEmail = (modelo: string): modelo is ModeloDeEmail =>
  (modelosDeEmail as readonly string[]).includes(modelo);

// "segunda-feira, 12 de outubro, às 09:00", no fuso da barbearia.
export function quandoPorExtenso(instante: string, fuso: string): string {
  const data = new Date(instante);
  const dia = data.toLocaleDateString("pt-BR", {
    timeZone: fuso,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const hora = data.toLocaleTimeString("pt-BR", {
    timeZone: fuso,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return `${dia}, às ${hora}`;
}

const escapar = (texto: string) =>
  texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const semBarraFinal = (url: string) => url.replace(/\/+$/, "");

type Conteudo = {
  assunto: string;
  abertura: string;
  detalhes: [string, string][];
  chamada: { texto: string; url: string };
};

function conteudoDe(modelo: ModeloDeEmail, d: DadosDoEmail, site: string): Conteudo {
  const quando = quandoPorExtenso(d.inicio, d.fuso);
  const detalhes: [string, string][] = [
    ["Serviço", d.servico],
    ["Quando", quando],
  ];
  if (d.endereco) detalhes.push(["Onde", d.endereco]);
  const primeiroNome = d.cliente_nome.trim().split(/\s+/)[0] ?? "";
  const ola = primeiroNome ? `Olá, ${primeiroNome}.` : "Olá.";

  switch (modelo) {
    case "confirmacao":
      return {
        assunto: `Agendamento confirmado: ${quando}`,
        abertura: `${ola} Seu horário na ${d.barbearia} está marcado.`,
        detalhes,
        chamada: { texto: "Ver meus horários", url: `${site}/cliente` },
      };
    case "lembrete":
      return {
        assunto: `Lembrete do seu horário: ${quando}`,
        abertura: `${ola} Seu horário na ${d.barbearia} está chegando.`,
        detalhes,
        chamada: { texto: "Remarcar ou cancelar", url: `${site}/cliente` },
      };
    case "remarcacao":
      return {
        assunto: `Agendamento remarcado: ${quando}`,
        abertura: `${ola} Seu horário na ${d.barbearia} mudou.`,
        detalhes: [
          ...detalhes,
          ...(d.inicio_anterior
            ? ([["Antes", quandoPorExtenso(d.inicio_anterior, d.fuso)]] as [string, string][])
            : []),
        ],
        chamada: { texto: "Ver meus horários", url: `${site}/cliente` },
      };
    case "cancelamento":
      return {
        assunto: `Agendamento cancelado: ${quando}`,
        abertura: `${ola} Seu horário na ${d.barbearia} foi cancelado.`,
        detalhes,
        chamada: { texto: "Agendar de novo", url: `${site}/agendamento` },
      };
  }
}

// `dados` vem do banco como JSON solto; aqui vira dado conhecido ou erro (que o envio registra).
export function montarEmail(
  modelo: ModeloDeEmail,
  dados: unknown,
  urlDoSite: string,
): EmailMontado {
  const d = dadosDoEmail.parse(dados);
  const site = semBarraFinal(urlDoSite);
  const c = conteudoDe(modelo, d, site);

  const texto = [
    c.abertura,
    "",
    ...c.detalhes.map(([rotulo, valor]) => `${rotulo}: ${valor}`),
    "",
    `${c.chamada.texto}: ${c.chamada.url}`,
    "",
    d.barbearia,
  ].join("\n");

  // Cores fixas e estilos em linha: e-mail não lê o CSS do site. Mesmas cores do Design System
  // (preto, laranja com texto preto, Cal).
  const linhas = c.detalhes
    .map(
      ([rotulo, valor]) =>
        `<tr><td style="padding:4px 16px 4px 0;color:#5f6672;font-size:16px">${escapar(rotulo)}</td>` +
        `<td style="padding:4px 0;font-size:16px;font-weight:600">${escapar(valor)}</td></tr>`,
    )
    .join("");
  const html =
    `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#fdfdfb;color:#131416;` +
    `font-family:Arial,Helvetica,sans-serif">` +
    `<div style="max-width:520px;margin:0 auto;padding:24px 16px">` +
    `<p style="font-size:20px;font-weight:800;margin:0 0 16px">${escapar(d.barbearia)}</p>` +
    `<p style="font-size:16px;line-height:1.5;margin:0 0 16px">${escapar(c.abertura)}</p>` +
    `<table role="presentation" style="border-collapse:collapse;margin:0 0 24px">${linhas}</table>` +
    `<a href="${escapar(c.chamada.url)}" style="display:inline-block;background:#ff7a1a;color:#131416;` +
    `font-size:16px;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:6px">` +
    `${escapar(c.chamada.texto)}</a>` +
    `</div></body></html>`;

  return { assunto: c.assunto, texto, html };
}
