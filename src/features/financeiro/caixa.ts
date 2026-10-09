// Conferência do caixa (regra F5). O banco calcula o que deveria haver na gaveta
// (`resumo_do_caixa`); aqui só se compara com o que o dono contou e se diz o resultado.
import { dinheiroDeCentavos } from "@/lib/dinheiro";

export type ResultadoDaConferencia = {
  tipo: "confere" | "sobrou" | "faltou";
  diferencaCentavos: number; // contado menos esperado
  texto: string;
};

export function conferirCaixa(
  contadoCentavos: number,
  esperadoCentavos: number,
): ResultadoDaConferencia {
  const diferencaCentavos = contadoCentavos - esperadoCentavos;
  if (diferencaCentavos === 0) {
    return {
      tipo: "confere",
      diferencaCentavos,
      texto: "Confere: o dinheiro contado bate com o esperado.",
    };
  }
  const valor = dinheiroDeCentavos(Math.abs(diferencaCentavos));
  return diferencaCentavos > 0
    ? { tipo: "sobrou", diferencaCentavos, texto: `Sobram ${valor} na gaveta.` }
    : { tipo: "faltou", diferencaCentavos, texto: `Faltam ${valor} na gaveta.` };
}
