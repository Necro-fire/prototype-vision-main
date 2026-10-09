// Relatórios do financeiro: compara um período com o anterior, monta a série dia a dia para o
// gráfico, ranqueia serviços e produtos e gera a planilha. Funções puras: o fuso e as datas
// entram como parâmetro, e o dinheiro é sempre em centavos inteiros.
import type { VendaDoDono } from "@/features/admin/vendas-do-dono";
import { somarDias } from "@/features/agenda/expediente";
import { faturamentoBruto, faturamentoPorDia, type AtendimentoFinanceiro } from "./faturamento";

export type Periodo = { de: string; ate: string }; // AAAA-MM-DD, inclusive nas duas pontas

export const LIMITE_DE_DIAS = 366;

const diferencaEmDias = (de: string, ate: string) =>
  Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);

export const quantosDias = (p: Periodo) => diferencaEmDias(p.de, p.ate) + 1;

// Texto de erro para um período que não dá para analisar; nulo se está certo.
export function validarPeriodo(p: Periodo): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.de) || !/^\d{4}-\d{2}-\d{2}$/.test(p.ate)) {
    return "Escolha a data inicial e a final.";
  }
  if (p.ate < p.de) return "A data final precisa ser igual ou depois da inicial.";
  if (quantosDias(p) > LIMITE_DE_DIAS) return "Escolha um período de até um ano.";
  return null;
}

export function diasDoPeriodo(p: Periodo): string[] {
  return Array.from({ length: quantosDias(p) }, (_, i) => somarDias(p.de, i));
}

// O período de mesmo tamanho que termina na véspera do início.
export function periodoAnterior(p: Periodo): Periodo {
  const n = quantosDias(p);
  return { de: somarDias(p.de, -n), ate: somarDias(p.de, -1) };
}

export type Predefinido = "ultimos7" | "ultimos30" | "mes" | "mesPassado";

export const rotulosDosPredefinidos: Record<Predefinido, string> = {
  ultimos7: "Últimos 7 dias",
  ultimos30: "Últimos 30 dias",
  mes: "Este mês",
  mesPassado: "Mês passado",
};

// `hoje` é o dia de hoje na barbearia (AAAA-MM-DD).
export function periodoPredefinido(nome: Predefinido, hoje: string): Periodo {
  if (nome === "ultimos7") return { de: somarDias(hoje, -6), ate: hoje };
  if (nome === "ultimos30") return { de: somarDias(hoje, -29), ate: hoje };
  const [ano = 0, mes = 1] = hoje.split("-").map(Number);
  const primeiroDoMes = `${ano}-${String(mes).padStart(2, "0")}-01`;
  if (nome === "mes") return { de: primeiroDoMes, ate: hoje };
  return { de: somarDias(primeiroDoMes, -1).slice(0, 8) + "01", ate: somarDias(primeiroDoMes, -1) };
}

// Variação percentual, com uma casa. Sem base de comparação (anterior zerado), não há percentual.
export function variacaoPercentual(atual: number, anterior: number): number | null {
  if (anterior <= 0) return null;
  return Math.round(((atual - anterior) / anterior) * 1000) / 10;
}

// "Subiu 12,5% sobre o período anterior", ou o motivo de não haver percentual.
export function descreverVariacao(variacao: number | null, atual: number, anterior: number) {
  if (variacao === null) {
    return atual === 0 && anterior === 0
      ? "Sem movimento nos dois períodos"
      : "O período anterior não teve valor para comparar";
  }
  if (variacao === 0) return "Igual ao período anterior";
  const numero = Math.abs(variacao).toFixed(1).replace(".", ",");
  return `${variacao > 0 ? "Subiu" : "Caiu"} ${numero}% sobre o período anterior`;
}

export function compararPeriodos(
  agendamentos: AtendimentoFinanceiro[],
  vendas: VendaDoDono[],
  fuso: string,
  periodo: Periodo,
) {
  const anterior = periodoAnterior(periodo);
  const atual = faturamentoBruto(agendamentos, vendas, fuso, periodo);
  const antes = faturamentoBruto(agendamentos, vendas, fuso, anterior);
  return {
    periodo,
    periodoAnterior: anterior,
    atual,
    anterior: antes,
    variacaoTotal: variacaoPercentual(atual.totalCentavos, antes.totalCentavos),
    variacaoServicos: variacaoPercentual(atual.servicosCentavos, antes.servicosCentavos),
    variacaoProdutos: variacaoPercentual(atual.produtosCentavos, antes.produtosCentavos),
  };
}

export type PontoDaSerie = {
  dia: string;
  servicosCentavos: number;
  produtosCentavos: number;
  totalCentavos: number;
};

// Um ponto por dia do período, inclusive os dias sem movimento (zerados), do mais antigo ao mais recente.
export function serieDiaria(
  agendamentos: AtendimentoFinanceiro[],
  vendas: VendaDoDono[],
  fuso: string,
  periodo: Periodo,
): PontoDaSerie[] {
  const porDia = new Map(
    faturamentoPorDia(agendamentos, vendas, fuso, periodo).map((d) => [d.dia, d]),
  );
  return diasDoPeriodo(periodo).map(
    (dia) => porDia.get(dia) ?? { dia, servicosCentavos: 0, produtosCentavos: 0, totalCentavos: 0 },
  );
}

export type LinhaDoRanking = { nome: string; quantidade: number; totalCentavos: number };

const porTotalEDepoisNome = (a: LinhaDoRanking, b: LinhaDoRanking) =>
  b.totalCentavos - a.totalCentavos ||
  b.quantidade - a.quantidade ||
  a.nome.localeCompare(b.nome, "pt-BR");

// Serviços concluídos no período, pelo valor cobrado de fato.
export function rankingDeServicos(
  agendamentos: AtendimentoFinanceiro[],
  fuso: string,
  periodo: Periodo,
): LinhaDoRanking[] {
  const mapa = new Map<string, LinhaDoRanking>();
  for (const a of agendamentos) {
    if (a.situacao !== "concluido") continue;
    const dia = new Date(a.inicio).toLocaleDateString("sv-SE", { timeZone: fuso });
    if (dia < periodo.de || dia > periodo.ate) continue;
    const linha = mapa.get(a.servicoId) ?? { nome: a.servicoNome, quantidade: 0, totalCentavos: 0 };
    linha.quantidade += 1;
    linha.totalCentavos += a.precoCentavos - a.descontoCentavos;
    mapa.set(a.servicoId, linha);
  }
  return [...mapa.values()].sort(porTotalEDepoisNome);
}

// Produtos vendidos no período (venda estornada não conta), pelo preço de tabela do item.
export function rankingDeProdutos(
  vendas: VendaDoDono[],
  fuso: string,
  periodo: Periodo,
): LinhaDoRanking[] {
  const mapa = new Map<string, LinhaDoRanking>();
  for (const v of vendas) {
    if (v.estornadaEm) continue;
    const dia = new Date(v.ocorridaEm).toLocaleDateString("sv-SE", { timeZone: fuso });
    if (dia < periodo.de || dia > periodo.ate) continue;
    for (const i of v.itens) {
      const linha = mapa.get(i.produtoId) ?? {
        nome: i.produtoNome,
        quantidade: 0,
        totalCentavos: 0,
      };
      linha.quantidade += i.quantidade;
      linha.totalCentavos += i.precoCentavos * i.quantidade;
      mapa.set(i.produtoId, linha);
    }
  }
  return [...mapa.values()].sort(porTotalEDepoisNome);
}

// Com períodos longos, o gráfico agrupa por semana para as barras continuarem legíveis.
export const DIAS_ATE_AGRUPAR = 45;

export function agruparPorSemana(serie: PontoDaSerie[]): PontoDaSerie[] {
  const grupos: PontoDaSerie[] = [];
  for (let i = 0; i < serie.length; i += 7) {
    const fatia = serie.slice(i, i + 7);
    grupos.push({
      dia: fatia[0]!.dia,
      servicosCentavos: fatia.reduce((t, p) => t + p.servicosCentavos, 0),
      produtosCentavos: fatia.reduce((t, p) => t + p.produtosCentavos, 0),
      totalCentavos: fatia.reduce((t, p) => t + p.totalCentavos, 0),
    });
  }
  return grupos;
}

// Planilha (CSV) ----------------------------------------------------------------------------
// Ponto e vírgula e vírgula decimal, que é o que o Excel em português lê sem configurar. Texto
// que começa com = + - @ viraria fórmula ao abrir na planilha: leva uma aspa simples na frente.

export type CelulaCsv = string | number | { centavos: number };

const centavosEmReais = (centavos: number) => {
  const sinal = centavos < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(centavos));
  return `${sinal}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
};

function celulaEmTexto(celula: CelulaCsv): string {
  if (typeof celula === "number") return String(celula);
  if (typeof celula === "object") return centavosEmReais(celula.centavos);
  const seguro = /^[=+\-@\t\r]/.test(celula) ? `'${celula}` : celula;
  return /[;"\r\n]/.test(seguro) ? `"${seguro.replaceAll('"', '""')}"` : seguro;
}

export function paraCsv(cabecalho: string[], linhas: CelulaCsv[][]): string {
  return (
    [cabecalho, ...linhas].map((l) => l.map((c) => celulaEmTexto(c)).join(";")).join("\r\n") +
    "\r\n"
  );
}
