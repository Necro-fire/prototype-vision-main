// Esvazia a fila de e-mails: pega o que já pode sair, monta, envia e registra o resultado.
// O banco decide o que está na hora (emails_reservar) e quando tentar de novo; aqui só se envia.
// As "portas" são injetadas para o teste não precisar de rede nem de banco.
import { ehModeloDeEmail, montarEmail } from "./modelos";

export type EmailDaFila = {
  id: string;
  destinatario: string;
  modelo: string;
  dados: unknown;
};

export type EmailPronto = { para: string; assunto: string; texto: string; html: string };

export type PortasDaFila = {
  reservar: (limite: number) => Promise<EmailDaFila[]>;
  // Lança erro se o envio não foi aceito pelo provedor.
  enviar: (email: EmailPronto, idempotencia: string) => Promise<void>;
  marcarEnviado: (id: string) => Promise<void>;
  marcarFalha: (id: string, erro: string) => Promise<void>;
};

export type ResultadoDaFila = { reservados: number; enviados: number; falhas: number };

const mensagemDe = (erro: unknown) => (erro instanceof Error ? erro.message : String(erro));

export async function processarFila(
  portas: PortasDaFila,
  { urlDoSite, limite = 10 }: { urlDoSite: string; limite?: number },
): Promise<ResultadoDaFila> {
  const emails = await portas.reservar(limite);
  let enviados = 0;
  let falhas = 0;
  for (const email of emails) {
    try {
      if (!ehModeloDeEmail(email.modelo)) throw new Error(`Modelo desconhecido: ${email.modelo}`);
      const { assunto, texto, html } = montarEmail(email.modelo, email.dados, urlDoSite);
      await portas.enviar({ para: email.destinatario, assunto, texto, html }, email.id);
    } catch (erro) {
      falhas += 1;
      await portas.marcarFalha(email.id, mensagemDe(erro));
      continue;
    }
    // Se este registro falhar o erro sobe: o e-mail já saiu, e a chave de idempotência do envio
    // impede que a nova tentativa, daqui a 10 minutos, mande outro igual.
    await portas.marcarEnviado(email.id);
    enviados += 1;
  }
  return { reservados: emails.length, enviados, falhas };
}
