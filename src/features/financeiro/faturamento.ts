// Faturamento bruto (regra F2): atendimentos concluídos + vendas de produtos, em centavos.
// Venda estornada não conta (F3). Os dias são os da barbearia, no fuso dela. Funções puras.
import type { Agendamento } from "@/features/agenda/agendamentos";
import { momentoNoFuso } from "@/features/agenda/expediente";
import type { VendaDoDono } from "@/features/admin/vendas-do-dono";

export type FiltroFinanceiro = {
  de?: string; // AAAA-MM-DD, inclusive
  ate?: string; // AAAA-MM-DD, inclusive
  servicoId?: string;
  produtoId?: string;
};

const dentro = (dia: string, f: FiltroFinanceiro) =>
  (!f.de || dia >= f.de) && (!f.ate || dia <= f.ate);

const diaDe = (instante: string, fuso: string) => momentoNoFuso(new Date(instante), fuso).data;

function servicosDoPeriodo(agendamentos: Agendamento[], fuso: string, f: FiltroFinanceiro) {
  if (f.produtoId) return [];
  return agendamentos.filter(
    (a) =>
      a.situacao === "concluido" &&
      dentro(diaDe(a.inicio, fuso), f) &&
      (!f.servicoId || a.servicoId === f.servicoId),
  );
}

// Escolhendo um produto, conta só os itens dele; sem filtro, o total da venda (já com desconto).
function valorDaVenda(v: VendaDoDono, produtoId: string | undefined) {
  if (!produtoId) return v.totalCentavos;
  return v.itens
    .filter((i) => i.produtoId === produtoId)
    .reduce((total, i) => total + i.precoCentavos * i.quantidade, 0);
}

function vendasDoPeriodo(vendas: VendaDoDono[], fuso: string, f: FiltroFinanceiro) {
  if (f.servicoId) return [];
  return vendas.filter(
    (v) =>
      !v.estornadaEm &&
      dentro(diaDe(v.ocorridaEm, fuso), f) &&
      (!f.produtoId || v.itens.some((i) => i.produtoId === f.produtoId)),
  );
}

export function faturamentoBruto(
  agendamentos: Agendamento[],
  vendas: VendaDoDono[],
  fuso: string,
  filtro: FiltroFinanceiro = {},
) {
  const servicos = servicosDoPeriodo(agendamentos, fuso, filtro);
  const produtos = vendasDoPeriodo(vendas, fuso, filtro);
  const servicosCentavos = servicos.reduce((t, a) => t + a.precoCentavos, 0);
  const produtosCentavos = produtos.reduce((t, v) => t + valorDaVenda(v, filtro.produtoId), 0);
  return {
    servicosCentavos,
    produtosCentavos,
    totalCentavos: servicosCentavos + produtosCentavos,
    atendimentos: servicos.length,
    vendas: produtos.length,
  };
}

export type LinhaDoDia = {
  dia: string;
  servicosCentavos: number;
  produtosCentavos: number;
  totalCentavos: number;
};

// Um resumo por dia, do mais recente para o mais antigo.
export function faturamentoPorDia(
  agendamentos: Agendamento[],
  vendas: VendaDoDono[],
  fuso: string,
  filtro: FiltroFinanceiro = {},
): LinhaDoDia[] {
  const dias = new Map<string, LinhaDoDia>();
  const dia = (d: string) => {
    const atual = dias.get(d) ?? {
      dia: d,
      servicosCentavos: 0,
      produtosCentavos: 0,
      totalCentavos: 0,
    };
    dias.set(d, atual);
    return atual;
  };
  for (const a of servicosDoPeriodo(agendamentos, fuso, filtro)) {
    dia(diaDe(a.inicio, fuso)).servicosCentavos += a.precoCentavos;
  }
  for (const v of vendasDoPeriodo(vendas, fuso, filtro)) {
    dia(diaDe(v.ocorridaEm, fuso)).produtosCentavos += valorDaVenda(v, filtro.produtoId);
  }
  return [...dias.values()]
    .map((d) => ({ ...d, totalCentavos: d.servicosCentavos + d.produtosCentavos }))
    .sort((a, b) => b.dia.localeCompare(a.dia));
}
