// O quadro de horários da semana, uma linha por dia. Funções puras: a tela só mostra.
import { horaCurta, type Expediente } from "@/features/agenda/expediente";

const nomesDosDias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export type LinhaDoQuadro = {
  // 0 = domingo, como em `Expediente.porDia`.
  dia: number;
  nome: string;
  // "9h às 12h e 14h às 18h", ou null quando a barbearia não abre.
  horas: string | null;
};

// Começa na segunda e termina no domingo, que é como o cliente lê a semana.
const ordem = [1, 2, 3, 4, 5, 6, 0];

export function quadroSemanal(expediente: Expediente): LinhaDoQuadro[] {
  return ordem.map((dia) => {
    const intervalos = expediente.porDia[dia] ?? [];
    return {
      dia,
      nome: nomesDosDias[dia] ?? "",
      horas:
        intervalos.length === 0
          ? null
          : intervalos.map((i) => `${horaCurta(i.abre)} às ${horaCurta(i.fecha)}`).join(" e "),
    };
  });
}
