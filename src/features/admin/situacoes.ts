// Caminho da situação de um agendamento, visto pelo dono. É a mesma regra de
// public.transicao_permitida no banco; supabase/testes/situacoes.test.ts prova que as duas
// concordam para todos os pares. O banco é quem barra: aqui só se escolhe o que oferecer.
import type { Situacao } from "@/features/agenda/agendamentos";

export const todasAsSituacoes: Situacao[] = [
  "agendado",
  "confirmado",
  "em_atendimento",
  "concluido",
  "cancelado",
  "nao_compareceu",
];

const transicoes: Record<Situacao, Situacao[]> = {
  agendado: ["confirmado", "em_atendimento", "cancelado", "nao_compareceu"],
  confirmado: ["em_atendimento", "cancelado", "nao_compareceu"],
  em_atendimento: ["concluido"],
  concluido: [],
  cancelado: [],
  nao_compareceu: [],
};

export const transicaoPermitida = (de: Situacao, para: Situacao) => transicoes[de].includes(para);

// "Não compareceu" só depois do início do horário (o banco recusa antes: ainda_nao_comecou).
export function proximasSituacoes(situacao: Situacao, inicio: string, agora: Date): Situacao[] {
  return transicoes[situacao].filter(
    (para) => para !== "nao_compareceu" || new Date(inicio).getTime() <= agora.getTime(),
  );
}

// O passo que o dono mais dá, em um toque.
const principal: Partial<Record<Situacao, Situacao>> = {
  agendado: "confirmado",
  confirmado: "em_atendimento",
  em_atendimento: "concluido",
};
export const acaoPrincipal = (situacao: Situacao) => principal[situacao] ?? null;

// Texto do botão: o que acontece, não o nome da situação.
export const rotuloDaAcao: Record<Situacao, string> = {
  agendado: "Voltar para agendado",
  confirmado: "Confirmar",
  em_atendimento: "Iniciar atendimento",
  concluido: "Concluir atendimento",
  cancelado: "Cancelar horário",
  nao_compareceu: "Não compareceu",
};
