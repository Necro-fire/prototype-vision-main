// Só roda no servidor (a pasta `server/` é barrada do navegador pelo Vite).
// Liga o envio de e-mails ao banco (função agendada chama a rota) e ao Resend.
import { createClient } from "@supabase/supabase-js";

import {
  processarFila,
  type EmailDaFila,
  type EmailPronto,
  type PortasDaFila,
  type ResultadoDaFila,
} from "@/features/emails/processar-fila";

export type ConfiguracaoDeEmails = {
  supabaseUrl: string;
  chaveDeServico: string;
  chaveDoResend: string;
  remetente: string;
  urlDoSite: string;
};

const NOMES = {
  chaveDeServico: "SUPABASE_SERVICE_ROLE_KEY",
  chaveDoResend: "RESEND_API_KEY",
  remetente: "EMAIL_REMETENTE",
  urlDoSite: "VITE_SITE_URL",
} as const;

// Lê o ambiente. Devolve o que falta pelo nome, para a rota explicar sem vazar valor nenhum.
export function lerConfiguracao(
  ambiente: Record<string, string | undefined>,
): { ok: true; configuracao: ConfiguracaoDeEmails } | { ok: false; faltam: string[] } {
  const supabaseUrl = ambiente["VITE_SUPABASE_URL"];
  const valores = {
    chaveDeServico: ambiente[NOMES.chaveDeServico],
    chaveDoResend: ambiente[NOMES.chaveDoResend],
    remetente: ambiente[NOMES.remetente],
    urlDoSite: ambiente[NOMES.urlDoSite],
  };
  const faltam = [
    ...(supabaseUrl ? [] : ["VITE_SUPABASE_URL"]),
    ...Object.entries(valores)
      .filter(([, valor]) => !valor)
      .map(([chave]) => NOMES[chave as keyof typeof NOMES]),
  ];
  if (faltam.length > 0 || !supabaseUrl) return { ok: false, faltam };
  return {
    ok: true,
    configuracao: {
      supabaseUrl,
      chaveDeServico: valores.chaveDeServico!,
      chaveDoResend: valores.chaveDoResend!,
      remetente: valores.remetente!,
      urlDoSite: valores.urlDoSite!,
    },
  };
}

export async function enviarPeloResend(
  configuracao: Pick<ConfiguracaoDeEmails, "chaveDoResend" | "remetente">,
  email: EmailPronto,
  idempotencia: string,
  buscar: typeof fetch = fetch,
): Promise<void> {
  const resposta = await buscar("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${configuracao.chaveDoResend}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencia,
    },
    body: JSON.stringify({
      from: configuracao.remetente,
      to: [email.para],
      subject: email.assunto,
      text: email.texto,
      html: email.html,
    }),
  });
  if (resposta.ok) return;
  const corpo = (await resposta.json().catch(() => null)) as { message?: unknown } | null;
  const motivo = typeof corpo?.message === "string" ? corpo.message : "sem detalhes";
  throw new Error(`Resend ${resposta.status}: ${motivo}`);
}

export function portasReais(configuracao: ConfiguracaoDeEmails): PortasDaFila {
  const banco = createClient(configuracao.supabaseUrl, configuracao.chaveDeServico, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const chamar = async (funcao: string, argumentos: Record<string, unknown>) => {
    const { data, error } = await banco.rpc(funcao, argumentos);
    if (error) throw new Error(`${funcao}: ${error.message}`);
    return data as unknown;
  };
  return {
    reservar: async (limite) =>
      (await chamar("emails_reservar", { p_limite: limite })) as EmailDaFila[],
    enviar: (email, idempotencia) => enviarPeloResend(configuracao, email, idempotencia),
    marcarEnviado: async (id) => void (await chamar("email_enviado", { p_id: id })),
    marcarFalha: async (id, erro) =>
      void (await chamar("email_falhou", { p_id: id, p_erro: erro })),
  };
}

export const processarFilaReal = (configuracao: ConfiguracaoDeEmails): Promise<ResultadoDaFila> =>
  processarFila(portasReais(configuracao), { urlDoSite: configuracao.urlDoSite });

// Comparação sem pistas de tempo, para o segredo da rota agendada.
export function segredoConfere(recebido: string | null, esperado: string): boolean {
  if (!recebido || recebido.length !== esperado.length) return false;
  let diferenca = 0;
  for (let i = 0; i < esperado.length; i++) {
    diferenca |= recebido.charCodeAt(i) ^ esperado.charCodeAt(i);
  }
  return diferenca === 0;
}

const json = (corpo: unknown, status: number) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

// A rota que o agendador chama (a cada poucos minutos): confere o segredo, esvazia a fila e conta.
// Nada de valor de chave na resposta: só o nome do que falta.
export async function responderAoAgendador(
  request: Request,
  ambiente: Record<string, string | undefined>,
  processar: (c: ConfiguracaoDeEmails) => Promise<ResultadoDaFila> = processarFilaReal,
): Promise<Response> {
  const segredo = ambiente["CRON_SECRET"];
  if (!segredo) return json({ erro: "Falta CRON_SECRET no servidor." }, 503);
  const recebido = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!segredoConfere(recebido, segredo)) return json({ erro: "Não autorizado." }, 401);

  const lido = lerConfiguracao(ambiente);
  if (!lido.ok) return json({ erro: "Configuração incompleta.", faltam: lido.faltam }, 503);
  try {
    return json(await processar(lido.configuracao), 200);
  } catch (erro) {
    console.error("Fila de e-mails:", erro);
    return json({ erro: "Não foi possível processar a fila." }, 500);
  }
}
