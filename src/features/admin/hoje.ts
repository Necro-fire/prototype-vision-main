// Contas da tela "Hoje" e da agenda da semana. Funções puras: `agora` e o fuso entram como
// parâmetro, nunca se lê o relógio do aparelho.
import type { Agendamento } from "@/features/agenda/agendamentos";
import { momentoNoFuso, somarDias } from "@/features/agenda/expediente";
import { diaDaSemanaDe } from "@/features/agenda/horarios-livres";

export type AgendamentoDoDono = Agendamento & {
  clienteId: string | null;
  clienteNome: string;
  clienteCelular: string;
};

const emAberto = ["agendado", "confirmado", "em_atendimento"];

export const diaDoAgendamento = (a: Agendamento, fuso: string) =>
  momentoNoFuso(new Date(a.inicio), fuso).data;

export function agendamentosDoDia<T extends Agendamento>(lista: T[], dia: string, fuso: string) {
  return lista
    .filter((a) => diaDoAgendamento(a, fuso) === dia)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
}

// O próximo atendimento do dia: o que está em curso, ou o primeiro ainda por começar.
export function proximoCliente<T extends Agendamento>(doDia: T[], agora: Date) {
  return (
    doDia.find(
      (a) =>
        emAberto.includes(a.situacao) &&
        (a.situacao === "em_atendimento" || new Date(a.fim).getTime() > agora.getTime()),
    ) ?? null
  );
}

// Cancelado e falta não contam como movimento do dia; o previsto é o que ainda pode entrar.
export function resumoDoDia(doDia: Agendamento[]) {
  const contam = doDia.filter((a) => a.situacao !== "cancelado" && a.situacao !== "nao_compareceu");
  return {
    marcados: contam.length,
    concluidos: doDia.filter((a) => a.situacao === "concluido").length,
    faltas: doDia.filter((a) => a.situacao === "nao_compareceu").length,
    cancelados: doDia.filter((a) => a.situacao === "cancelado").length,
    previstoCentavos: contam.reduce((total, a) => total + a.precoCentavos, 0),
    recebidoCentavos: doDia
      .filter((a) => a.situacao === "concluido")
      .reduce((total, a) => total + a.precoCentavos, 0),
  };
}

// Segunda a domingo da semana que contém `dia`.
export function diasDaSemana(dia: string) {
  const deslocamento = (diaDaSemanaDe(dia) + 6) % 7; // segunda = 0
  const segunda = somarDias(dia, -deslocamento);
  return Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
}

// Lembrete de quem passou do horário sem ser atendido nem marcado (mesma ideia do alerta
// "falta_sem_registro" do banco): ainda aberto e já terminou.
export function semRegistro<T extends Agendamento>(lista: T[], agora: Date) {
  return lista.filter(
    (a) =>
      (a.situacao === "agendado" || a.situacao === "confirmado") &&
      new Date(a.fim).getTime() <= agora.getTime(),
  );
}
