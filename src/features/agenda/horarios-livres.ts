// Horários livres de um dia, calculados no fuso da barbearia e a partir dos períodos ocupados que o
// banco devolve (horarios_ocupados). Não usa o relógio do aparelho: `agora` entra como parâmetro.
// As regras são as mesmas de public.reservar; o teste supabase/testes/paridade.test.ts prova que
// tudo o que esta função oferece o banco aceita, e tudo o que ela esconde o banco recusa.

export type Intervalo = { abre: string; fecha: string }; // "HH:MM", no fuso da barbearia
export type Periodo = { inicio: string; fim: string }; // instantes ISO

export type ParametrosDeHorarios = {
  dia: string; // AAAA-MM-DD, dia do calendário no fuso da barbearia
  duracaoMinutos: number;
  gradeMinutos: number;
  fuso: string;
  intervalos: Intervalo[]; // funcionamento do dia da semana de `dia` (vazio = fechado)
  ocupados: Periodo[];
  agora: Date;
  antecedenciaMaxDias: number;
};

const MINUTO = 60_000;

const paraMinutos = (hora: string) => {
  const [h = 0, m = 0] = hora.split(":").map(Number);
  return h * 60 + m;
};

// Diferença, em minutos, entre a hora de parede do fuso e o UTC naquele instante.
function deslocamentoDoFuso(instante: number, fuso: string) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: fuso,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(new Date(instante));
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value);
  const comoUtc = Date.UTC(
    valor("year"),
    valor("month") - 1,
    valor("day"),
    valor("hour"),
    valor("minute"),
    valor("second"),
  );
  return Math.round((comoUtc - Math.floor(instante / 1000) * 1000) / MINUTO);
}

// "2026-10-12" às 540 minutos (09:00) no fuso → instante.
export function instanteNoFuso(dia: string, minutosDoDia: number, fuso: string): number {
  const [ano = 0, mes = 1, diaDoMes = 1] = dia.split("-").map(Number);
  const comoSeFosseUtc = Date.UTC(ano, mes - 1, diaDoMes, 0, minutosDoDia);
  // Duas passadas resolvem a hora de verão, onde o deslocamento muda no meio do dia.
  let instante = comoSeFosseUtc - deslocamentoDoFuso(comoSeFosseUtc, fuso) * MINUTO;
  instante = comoSeFosseUtc - deslocamentoDoFuso(instante, fuso) * MINUTO;
  return instante;
}

// 0 = domingo. `dia` é uma data de calendário, então não depende do fuso.
export function diaDaSemanaDe(dia: string) {
  const [ano = 0, mes = 1, diaDoMes = 1] = dia.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, diaDoMes)).getUTCDay();
}

// Instantes de início (ISO, em UTC) que podem ser reservados.
export function horariosLivres(p: ParametrosDeHorarios): string[] {
  const livres: string[] = [];
  const agora = p.agora.getTime();
  const limite = agora + p.antecedenciaMaxDias * 24 * 60 * MINUTO;
  const ocupados = p.ocupados.map((o) => ({
    inicio: new Date(o.inicio).getTime(),
    fim: new Date(o.fim).getTime(),
  }));

  for (const intervalo of p.intervalos) {
    const abre = paraMinutos(intervalo.abre);
    const fecha = paraMinutos(intervalo.fecha);
    // A grade vale para a hora do dia (09:00, 09:30...), não para o minuto em que o intervalo abre.
    const primeiro = Math.ceil(abre / p.gradeMinutos) * p.gradeMinutos;
    for (let minuto = primeiro; minuto + p.duracaoMinutos <= fecha; minuto += p.gradeMinutos) {
      const inicio = instanteNoFuso(p.dia, minuto, p.fuso);
      const fim = inicio + p.duracaoMinutos * MINUTO;
      if (inicio <= agora || inicio > limite) continue;
      if (ocupados.some((o) => inicio < o.fim && fim > o.inicio)) continue;
      livres.push(new Date(inicio).toISOString());
    }
  }
  return livres.sort();
}

// "09:30" no fuso da barbearia, para mostrar ao cliente.
export function horaNoFuso(instanteIso: string, fuso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(instanteIso));
}
