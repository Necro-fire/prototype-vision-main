// Funcionamento da barbearia como o banco guarda: intervalos por dia da semana, no fuso da
// barbearia. Funções puras; `agora` entra como parâmetro, nunca se lê o relógio do aparelho.
import { z } from "zod";

import { dataLonga } from "@/lib/datas";
import { diaDaSemanaDe, horaNoFuso, type Intervalo } from "./horarios-livres";

export type Expediente = {
  fuso: string;
  gradeMinutos: number;
  antecedenciaMaxDias: number;
  // Índice 0 = domingo. Dia fechado = lista vazia. Intervalos em ordem, sem sobreposição.
  porDia: Intervalo[][];
};

export type Funcionamento = { aberto: boolean; texto: string };

const diasDaSemana = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const linhaDeEmpresa = z.object({
  fuso: z.string(),
  grade_minutos: z.number().int(),
  antecedencia_max_dias: z.number().int(),
});

const linhaDeFuncionamento = z.object({
  dia_semana: z.number().int().min(0).max(6),
  abre: z.string(),
  fecha: z.string(),
});

// O Postgres devolve "09:00:00"; o resto do código usa "09:00".
const hhmm = (hora: string) => hora.slice(0, 5);

const emMinutos = (hora: string) => {
  const [h = 0, m = 0] = hora.split(":").map(Number);
  return h * 60 + m;
};

export function expedienteDeLinhas(empresa: unknown, funcionamento: unknown[]): Expediente {
  const e = linhaDeEmpresa.parse(empresa);
  const porDia: Intervalo[][] = Array.from({ length: 7 }, () => []);
  for (const linha of funcionamento) {
    const l = linhaDeFuncionamento.parse(linha);
    porDia[l.dia_semana]?.push({ abre: hhmm(l.abre), fecha: hhmm(l.fecha) });
  }
  for (const intervalos of porDia) intervalos.sort((a, b) => emMinutos(a.abre) - emMinutos(b.abre));
  return {
    fuso: e.fuso,
    gradeMinutos: e.grade_minutos,
    antecedenciaMaxDias: e.antecedencia_max_dias,
    porDia,
  };
}

// Data, hora e dia da semana de um instante, vistos no fuso da barbearia.
export function momentoNoFuso(agora: Date, fuso: string) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: fuso,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(agora);
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "0";
  const data = `${valor("year")}-${valor("month")}-${valor("day")}`;
  return {
    data,
    minutos: Number(valor("hour")) * 60 + Number(valor("minute")),
    diaSemana: diaDaSemanaDe(data),
  };
}

// "2026-10-12" + 3 → "2026-10-15". Calendário puro, sem fuso.
export function somarDias(data: string, dias: number) {
  const [ano = 0, mes = 1, dia = 1] = data.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

// "19:00" → "19h"; "12:30" → "12h30".
export function horaCurta(hora: string) {
  const [h = "0", m = "00"] = hora.split(":");
  return m === "00" ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

// Diz se a barbearia está aberta e, se não estiver, quando abre de novo.
export function abertoAgora(expediente: Expediente, agora: Date): Funcionamento {
  const { diaSemana, minutos } = momentoNoFuso(agora, expediente.fuso);
  const hoje = expediente.porDia[diaSemana] ?? [];

  const atual = hoje.find((i) => minutos >= emMinutos(i.abre) && minutos < emMinutos(i.fecha));
  if (atual) return { aberto: true, texto: `Aberto agora, até as ${horaCurta(atual.fecha)}` };

  const maisTarde = hoje.find((i) => minutos < emMinutos(i.abre));
  if (maisTarde) {
    return { aberto: false, texto: `Fechado. Abre hoje às ${horaCurta(maisTarde.abre)}` };
  }

  for (let passo = 1; passo <= 7; passo++) {
    const dia = (diaSemana + passo) % 7;
    const primeiro = expediente.porDia[dia]?.[0];
    if (!primeiro) continue;
    const nome = diasDaSemana[dia] ?? "";
    const quando = passo === 1 ? "amanhã" : passo === 7 ? `${nome} que vem` : nome;
    return { aberto: false, texto: `Fechado. Abre ${quando} às ${horaCurta(primeiro.abre)}` };
  }
  return { aberto: false, texto: "Fechado no momento" };
}

// "segunda a sábado", "segunda a quarta e sexta", "sábado". Dias seguidos viram um intervalo.
export function descreverDias(dias: number[]) {
  const ordenados = [...new Set(dias)].sort((a, b) => a - b);
  const trechos: string[] = [];
  for (let i = 0; i < ordenados.length;) {
    let fim = i;
    while (ordenados[fim + 1] === (ordenados[fim] ?? -2) + 1) fim++;
    const primeiro = diasDaSemana[ordenados[i] ?? 0] ?? "";
    const ultimo = diasDaSemana[ordenados[fim] ?? 0] ?? "";
    if (fim - i >= 2) trechos.push(`${primeiro} a ${ultimo}`);
    else for (let k = i; k <= fim; k++) trechos.push(diasDaSemana[ordenados[k] ?? 0] ?? "");
    i = fim + 1;
  }
  if (trechos.length === 0) return "";
  if (trechos.length === 1) return trechos[0] ?? "";
  return `${trechos.slice(0, -1).join(", ")} e ${trechos.at(-1)}`;
}

// Agrupa os dias que têm o mesmo horário: [{ dias: "segunda a sexta", horas: "9h às 19h" }, ...].
export function descreverExpediente(expediente: Expediente) {
  const grupos = new Map<string, { dias: number[]; horas: string }>();
  expediente.porDia.forEach((intervalos, dia) => {
    if (intervalos.length === 0) return;
    const horas = intervalos
      .map((i) => `${horaCurta(i.abre)} às ${horaCurta(i.fecha)}`)
      .join(" e ");
    const grupo = grupos.get(horas) ?? { dias: [], horas };
    grupo.dias.push(dia);
    grupos.set(horas, grupo);
  });
  return [...grupos.values()].map((g) => ({ dias: descreverDias(g.dias), horas: g.horas }));
}

// "hoje", "amanhã" ou "sexta, 9/10", comparando dias de calendário.
export function rotuloDoDia(data: string, hoje: string) {
  const dias = (d: string) => {
    const [ano = 0, mes = 1, dia = 1] = d.split("-").map(Number);
    return Date.UTC(ano, mes - 1, dia) / 86_400_000;
  };
  const diferenca = dias(data) - dias(hoje);
  if (diferenca === 0) return "hoje";
  if (diferenca === 1) return "amanhã";
  const [, mes = "0", dia = "0"] = data.split("-");
  return `${diasDaSemana[diaDaSemanaDe(data)] ?? ""}, ${Number(dia)}/${Number(mes)}`;
}

// "quinta-feira, 8 de outubro, às 09:30", no fuso da barbearia.
export function descreverQuando(inicio: string, fuso: string) {
  const { data } = momentoNoFuso(new Date(inicio), fuso);
  return `${dataLonga(data)}, às ${horaNoFuso(inicio, fuso)}`;
}
