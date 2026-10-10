import { dataCurta } from "@/lib/datas";
import { dinheiroDeCentavos } from "@/lib/dinheiro";

export type PontoDoGrafico = {
  dia: string; // AAAA-MM-DD: o primeiro dia do grupo
  atualCentavos: number;
  anteriorCentavos: number;
};

// Barras lado a lado: o período anterior em cinza e o atual em laranja com contorno. As cores
// não carregam o sentido sozinhas: há legenda escrita, um título em cada grupo e a tabela com
// os mesmos valores logo abaixo.
export function GraficoComparativo({
  pontos,
  resumo,
  agrupadoPorSemana,
}: {
  pontos: PontoDoGrafico[];
  resumo: string;
  agrupadoPorSemana: boolean;
}) {
  const maior = Math.max(1, ...pontos.flatMap((p) => [p.atualCentavos, p.anteriorCentavos]));
  const altura = (centavos: number) =>
    centavos <= 0 ? "0%" : `max(${(centavos / maior) * 100}%, 3px)`;
  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];

  return (
    <figure className="grid gap-3 rounded-xl border border-line bg-card p-4">
      <figcaption className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="size-4 bg-primary" />
          Período escolhido
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="size-4 bg-muted-foreground" />
          Período anterior
        </span>
        <span className="text-muted-foreground">
          {agrupadoPorSemana ? "Cada grupo é uma semana. " : ""}
          Maior valor: {dinheiroDeCentavos(maior === 1 ? 0 : maior)}
        </span>
      </figcaption>
      <div
        role="img"
        aria-label={resumo}
        className="flex h-48 items-end gap-0.5 border-b border-line"
      >
        {pontos.map((p) => (
          <div
            key={p.dia}
            title={`${agrupadoPorSemana ? "Semana de " : ""}${dataCurta(p.dia)}: ${dinheiroDeCentavos(p.atualCentavos)} (anterior: ${dinheiroDeCentavos(p.anteriorCentavos)})`}
            className="flex h-full min-w-0 flex-1 items-end justify-center gap-px"
          >
            <div
              className="w-1/2 max-w-3 bg-muted-foreground"
              style={{ height: altura(p.anteriorCentavos) }}
            />
            <div className="w-1/2 max-w-3 bg-primary" style={{ height: altura(p.atualCentavos) }} />
          </div>
        ))}
      </div>
      {primeiro && ultimo && (
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{dataCurta(primeiro.dia)}</span>
          <span>{dataCurta(ultimo.dia)}</span>
        </div>
      )}
    </figure>
  );
}
