// Leitura pública da agenda no banco: funcionamento, regras da agenda e horários ocupados.
import { z } from "zod";

import { falhaDoBanco, supabasePublico } from "@/lib/supabase";
import { expedienteDeLinhas, momentoNoFuso, somarDias, type Expediente } from "./expediente";
import { diaDaSemanaDe, horariosLivres, type Periodo } from "./horarios-livres";

export async function lerExpediente(): Promise<Expediente> {
  const banco = supabasePublico();
  const [empresa, funcionamento] = await Promise.all([
    banco.from("empresa").select("fuso, grade_minutos, antecedencia_max_dias").single(),
    banco.from("funcionamento").select("dia_semana, abre, fecha"),
  ]);
  if (empresa.error)
    throw falhaDoBanco("Não foi possível ler os dados da barbearia", empresa.error);
  if (funcionamento.error) {
    throw falhaDoBanco("Não foi possível ler o funcionamento", funcionamento.error);
  }
  return expedienteDeLinhas(empresa.data, funcionamento.data ?? []);
}

const periodo = z.object({ inicio: z.string(), fim: z.string() });

// Períodos já tomados no dia (agendamentos ativos e bloqueios), sem dados de ninguém.
export async function lerOcupados(dia: string): Promise<Periodo[]> {
  const { data, error } = await supabasePublico().rpc("horarios_ocupados", { p_dia: dia });
  if (error) throw falhaDoBanco("Não foi possível ler os horários ocupados", error);
  return z.array(periodo).parse(data ?? []);
}

export type HorariosDoDia = { dia: string; horarios: string[] };

// Horários livres de um dia para um serviço de certa duração, no fuso da barbearia.
export async function lerHorariosLivres(
  expediente: Expediente,
  dia: string,
  duracaoMinutos: number,
  agora: Date,
): Promise<HorariosDoDia> {
  const intervalos = expediente.porDia[diaDaSemanaDe(dia)] ?? [];
  if (intervalos.length === 0) return { dia, horarios: [] };
  const ocupados = await lerOcupados(dia);
  const horarios = horariosLivres({
    dia,
    duracaoMinutos,
    gradeMinutos: expediente.gradeMinutos,
    fuso: expediente.fuso,
    intervalos,
    ocupados,
    agora,
    antecedenciaMaxDias: expediente.antecedenciaMaxDias,
  });
  return { dia, horarios };
}

// Primeiro dia, a partir de hoje, com algum horário livre.
export async function lerProximoHorario(
  expediente: Expediente,
  duracaoMinutos: number,
  agora: Date,
  diasAFrente = 14,
): Promise<HorariosDoDia | null> {
  const hoje = momentoNoFuso(agora, expediente.fuso).data;
  for (let passo = 0; passo <= diasAFrente; passo++) {
    const dia = somarDias(hoje, passo);
    const livres = await lerHorariosLivres(expediente, dia, duracaoMinutos, agora);
    if (livres.horarios.length > 0) return livres;
  }
  return null;
}
