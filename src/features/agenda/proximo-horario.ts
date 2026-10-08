import { availableTimes, isoDate } from "./disponibilidade";
import type { Hours } from "./funcionamento";
import type { Booking } from "./tipos";

export type HorariosDoDia = { date: string; times: string[] };

// Primeiro dia, a partir de hoje, com algum horário livre para o serviço.
export function proximosHorarios(
  duration: number,
  bookings: Booking[],
  hours: Hours,
  from = new Date(),
  diasAFrente = 14,
): HorariosDoDia | null {
  for (let passo = 0; passo <= diasAFrente; passo++) {
    const dia = new Date(from.getFullYear(), from.getMonth(), from.getDate() + passo);
    const date = isoDate(dia);
    const times = availableTimes(date, duration, bookings, hours.open, hours.close, hours.days);
    if (times.length > 0) return { date, times };
  }
  return null;
}

const diasDaSemana = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

// "hoje", "amanhã" ou "sexta, 9/10".
export function rotuloDia(date: string, from = new Date()) {
  const dia = new Date(`${date}T12:00:00`);
  const hoje = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12);
  const diferenca = Math.round((dia.getTime() - hoje.getTime()) / 86_400_000);
  if (diferenca === 0) return "hoje";
  if (diferenca === 1) return "amanhã";
  return `${diasDaSemana[dia.getDay()] ?? ""}, ${dia.getDate()}/${dia.getMonth() + 1}`;
}
