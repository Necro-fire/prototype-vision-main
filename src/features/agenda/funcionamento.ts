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

// "segunda a sábado", "segunda a quarta e sexta", "sábado". Dias seguidos viram um intervalo.
export function descreverDias(days: number[]) {
  const ordenados = [...new Set(days)].sort((a, b) => a - b);
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

export function descreverFuncionamento(hours: Hours) {
  return { dias: descreverDias(hours.days), horas: `${hours.open}h às ${hours.close}h` };
}
