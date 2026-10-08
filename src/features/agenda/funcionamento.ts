export type Hours = { open: number; close: number; days: number[] };

export type Funcionamento = { aberto: boolean; texto: string };

const diasDaSemana = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

// Diz se a barbearia está aberta e, se não estiver, quando abre de novo.
// Usa o relógio do aparelho; na Fase 3 passa a usar o fuso da barbearia.
export function abertoAgora(hours: Hours, now = new Date()): Funcionamento {
  const minutos = now.getHours() * 60 + now.getMinutes();
  const hoje = now.getDay();
  const abreHoje = hours.days.includes(hoje);
  if (abreHoje && minutos >= hours.open * 60 && minutos < hours.close * 60) {
    return { aberto: true, texto: `Aberto agora, até as ${hours.close}h` };
  }
  if (abreHoje && minutos < hours.open * 60) {
    return { aberto: false, texto: `Fechado. Abre hoje às ${hours.open}h` };
  }
  for (let passo = 1; passo <= 7; passo++) {
    const dia = (hoje + passo) % 7;
    if (!hours.days.includes(dia)) continue;
    const quando = passo === 1 ? "amanhã" : (diasDaSemana[dia] ?? "");
    return { aberto: false, texto: `Fechado. Abre ${quando} às ${hours.open}h` };
  }
  return { aberto: false, texto: "Fechado no momento" };
}
