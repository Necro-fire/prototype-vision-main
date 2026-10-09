// Agendamentos do cliente no banco. Reservar, cancelar e remarcar são funções do banco (RPC):
// é lá que moram as regras e a barreira contra dois horários iguais. Aqui só se chama e se traduz.
import { z } from "zod";

import { ErroDoBanco, falhou } from "@/lib/erro-do-banco";
import { supabaseNavegador } from "@/lib/supabase-navegador";

export type Situacao =
  "agendado" | "confirmado" | "em_atendimento" | "concluido" | "cancelado" | "nao_compareceu";

export type Agendamento = {
  id: string;
  servicoId: string;
  servicoNome: string;
  precoCentavos: number;
  descontoCentavos: number; // cupom ou serviço grátis da fidelidade; nunca passa do preço
  duracaoMinutos: number;
  inicio: string; // instante ISO
  fim: string;
  situacao: Situacao;
  observacao: string;
};

const linhaDeAgendamento = z.object({
  id: z.string(),
  servico_id: z.string(),
  servico_nome: z.string(),
  preco_centavos: z.number().int(),
  desconto_centavos: z.number().int().nullish(),
  duracao_minutos: z.number().int(),
  inicio: z.string(),
  fim: z.string(),
  situacao: z.enum([
    "agendado",
    "confirmado",
    "em_atendimento",
    "concluido",
    "cancelado",
    "nao_compareceu",
  ]),
  observacao: z.string(),
});

export function agendamentoDeLinha(linha: unknown): Agendamento {
  const l = linhaDeAgendamento.parse(linha);
  return {
    id: l.id,
    servicoId: l.servico_id,
    servicoNome: l.servico_nome,
    precoCentavos: l.preco_centavos,
    descontoCentavos: l.desconto_centavos ?? 0,
    duracaoMinutos: l.duracao_minutos,
    inicio: l.inicio,
    fim: l.fim,
    situacao: l.situacao,
    observacao: l.observacao,
  };
}

// O que será cobrado de fato: o preço do serviço menos o desconto.
export const valorCobradoCentavos = (a: Pick<Agendamento, "precoCentavos" | "descontoCentavos">) =>
  a.precoCentavos - a.descontoCentavos;

// Nomes que a tela mostra (o SituacaoBadge usa estes).
const rotulos: Record<Situacao, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  em_atendimento: "Em atendimento",
  concluido: "Concluído",
  cancelado: "Cancelado",
  nao_compareceu: "Não compareceu",
};
export const rotuloDaSituacao = (situacao: Situacao) => rotulos[situacao];

// Situações em que o horário ainda está reservado para o cliente.
const emAberto: Situacao[] = ["agendado", "confirmado", "em_atendimento"];

// O cliente cancela ou remarca até o início do horário (regra A10), e só enquanto não é final.
export function podeAlterar(a: Agendamento, agora: Date) {
  return (
    (a.situacao === "agendado" || a.situacao === "confirmado") &&
    new Date(a.inicio).getTime() > agora.getTime()
  );
}

// Próximos: reservados e ainda por vir (ou em atendimento), do mais cedo para o mais tarde.
// Histórico: o resto, do mais recente para o mais antigo.
export function separarAgendamentos(lista: Agendamento[], agora: Date) {
  const ehProximo = (a: Agendamento) =>
    emAberto.includes(a.situacao) &&
    (a.situacao === "em_atendimento" || new Date(a.fim).getTime() > agora.getTime());
  const porInicio = (a: Agendamento, b: Agendamento) => a.inicio.localeCompare(b.inicio);
  return {
    proximos: lista.filter(ehProximo).sort(porInicio),
    historico: lista.filter((a) => !ehProximo(a)).sort((a, b) => porInicio(b, a)),
  };
}

// O horário escolhido deixou de servir (alguém reservou antes, passou da hora...): vale voltar
// à escolha de horário, não só mostrar o erro.
const codigosDeHorario = [
  "horario_indisponivel",
  "horario_no_passado",
  "horario_longe_demais",
  "horario_fora_da_grade",
  "fora_do_funcionamento",
  "horario_bloqueado",
];
export { ErroDoBanco };
export const ehErroDeHorario = (erro: unknown) =>
  erro instanceof ErroDoBanco && codigosDeHorario.includes(erro.codigo);

export async function lerMeusAgendamentos(): Promise<Agendamento[]> {
  const { data, error } = await supabaseNavegador()
    .from("agendamentos")
    .select(
      "id, servico_id, servico_nome, preco_centavos, desconto_centavos, duracao_minutos, inicio, fim, situacao, observacao",
    )
    .order("inicio", { ascending: false });
  if (error) falhou(error);
  return (data ?? []).map(agendamentoDeLinha);
}

export async function reservar(entrada: {
  servicoId: string;
  inicio: string;
  observacao: string;
  cupom?: string;
}): Promise<Agendamento> {
  const { data, error } = await supabaseNavegador().rpc("reservar", {
    p_servico_id: entrada.servicoId,
    p_inicio: entrada.inicio,
    p_observacao: entrada.observacao,
    ...(entrada.cupom ? { p_cupom: entrada.cupom } : {}),
  });
  if (error) falhou(error);
  return agendamentoDeLinha(data);
}

export async function cancelar(id: string): Promise<Agendamento> {
  const { data, error } = await supabaseNavegador().rpc("cancelar_agendamento", { p_id: id });
  if (error) falhou(error);
  return agendamentoDeLinha(data);
}

export async function remarcar(id: string, novoInicio: string): Promise<Agendamento> {
  const { data, error } = await supabaseNavegador().rpc("remarcar", {
    p_id: id,
    p_novo_inicio: novoInicio,
  });
  if (error) falhou(error);
  return agendamentoDeLinha(data);
}

export async function excluirMinhaConta(): Promise<void> {
  const { error } = await supabaseNavegador().rpc("excluir_minha_conta");
  if (error) falhou(error);
}

// Completa nome e celular do perfil (o banco exige os dois para reservar).
export async function salvarPerfil(
  id: string,
  dados: { nome: string; celular: string; lembretesPorEmail?: boolean },
): Promise<void> {
  const { error } = await supabaseNavegador()
    .from("perfis")
    .update({
      nome: dados.nome,
      celular: dados.celular,
      ...(dados.lembretesPorEmail === undefined
        ? {}
        : { lembretes_por_email: dados.lembretesPorEmail }),
    })
    .eq("id", id);
  if (error) falhou(error);
}
