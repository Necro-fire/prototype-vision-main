import { EstadoCarregando } from "@/components/ui/carregando";
import { useQueries } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { lerOcupados } from "@/features/agenda/banco";
import { momentoNoFuso, somarDias, type Expediente } from "@/features/agenda/expediente";
import { diaDaSemanaDe, horaNoFuso, horariosLivres } from "@/features/agenda/horarios-livres";
import { dataLonga, diaDaSemanaCurto, diaDoMes } from "@/lib/datas";
import { cn } from "@/lib/utils";

const DIAS_A_FRENTE = 14;

// Escolha de dia e horário, no fuso da barbearia. Os horários livres saem de `horariosLivres`
// (a mesma regra do banco, com paridade provada em teste) sobre os períodos ocupados que o banco
// informa. O valor escolhido é o instante de início, em ISO.
export function SeletorDeHorario({
  expediente,
  agora,
  duracaoMinutos,
  valor,
  aoEscolher,
  erro,
}: {
  expediente: Expediente;
  agora: Date;
  duracaoMinutos: number;
  valor: string | null;
  aoEscolher: (inicio: string | null) => void;
  erro?: string | undefined;
}) {
  const hoje = momentoNoFuso(agora, expediente.fuso).data;
  const dias = useMemo(
    () => Array.from({ length: DIAS_A_FRENTE }, (_, i) => somarDias(hoje, i)),
    [hoje],
  );
  const intervalosDe = (dia: string) => expediente.porDia[diaDaSemanaDe(dia)] ?? [];

  const consultas = useQueries({
    queries: dias.map((dia) => ({
      queryKey: ["ocupados", dia],
      queryFn: () => lerOcupados(dia),
      staleTime: 15_000,
      enabled: intervalosDe(dia).length > 0,
    })),
  });

  const grade = dias.map((dia, i) => {
    const ocupados = consultas[i]?.data;
    const horarios =
      ocupados && intervalosDe(dia).length > 0
        ? horariosLivres({
            dia,
            duracaoMinutos,
            gradeMinutos: expediente.gradeMinutos,
            fuso: expediente.fuso,
            intervalos: intervalosDe(dia),
            ocupados,
            agora,
            antecedenciaMaxDias: expediente.antecedenciaMaxDias,
          })
        : [];
    return { dia, horarios };
  });

  const carregando = consultas.some(
    (c, i) => intervalosDe(dias[i] ?? "").length > 0 && c.isPending,
  );
  const falhou = consultas.some((c) => c.isError);

  const diaDoValor = valor ? momentoNoFuso(new Date(valor), expediente.fuso).data : null;
  const [escolhido, setEscolhido] = useState<string | null>(diaDoValor);
  const diaAtual = escolhido ?? grade.find((d) => d.horarios.length > 0)?.dia ?? null;
  const horarios = grade.find((d) => d.dia === diaAtual)?.horarios ?? [];

  if (carregando) return <EstadoCarregando texto="Carregando os horários." />;

  if (falhou) {
    return (
      <div className="grid justify-items-start gap-3 rounded-xl border border-dashed border-line bg-card/40 p-5">
        <p role="alert" className="text-base font-semibold">
          Não conseguimos ver os horários agora. Confira a internet e tente de novo.
        </p>
        <Button variant="outline" onClick={() => consultas.forEach((c) => void c.refetch())}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  if (grade.every((d) => d.horarios.length === 0)) {
    return (
      <p className="rounded-xl border border-dashed border-line bg-card/40 p-5 text-base">
        Não há horários livres nos próximos {DIAS_A_FRENTE} dias.{" "}
        <Link to="/contato" className="font-semibold text-info underline">
          Veja como falar com a barbearia
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="@container grid gap-6">
      <div className="grid gap-2">
        <p id="rotulo-dia" className="text-base font-semibold">
          Dia
        </p>
        {/* Faixa que rola de lado no espaço estreito; com espaço, as duas semanas viram grade. */}
        <div
          role="group"
          aria-labelledby="rotulo-dia"
          className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 @sm:mx-0 @sm:grid @sm:grid-cols-7 @sm:gap-1.5 @sm:overflow-visible @sm:px-0 @sm:pb-0"
        >
          {grade.map((d) => {
            const semVaga = d.horarios.length === 0;
            return (
              <button
                key={d.dia}
                type="button"
                disabled={semVaga}
                aria-pressed={d.dia === diaAtual}
                aria-label={`${dataLonga(d.dia)}${semVaga ? ", sem horários livres" : ""}`}
                onClick={() => {
                  setEscolhido(d.dia);
                  aoEscolher(null);
                }}
                className={cn(
                  "grid min-h-20 min-w-16 shrink-0 cursor-pointer place-items-center content-center rounded-md border-2 px-2 transition-colors @sm:min-h-16 @sm:min-w-0 @sm:px-0",
                  d.dia === diaAtual
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-card hover:bg-muted",
                  semVaga &&
                    "cursor-not-allowed border-dashed border-border bg-transparent text-muted-foreground line-through hover:bg-transparent",
                )}
              >
                <span className="text-sm font-semibold">{diaDaSemanaCurto(d.dia)}</span>
                <span className="font-display text-2xl font-semibold leading-none">
                  {diaDoMes(d.dia)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-2">
        <p id="rotulo-hora" className="text-base font-semibold">
          Horário{diaAtual ? `, ${dataLonga(diaAtual)}` : ""}
        </p>
        <div
          role="group"
          aria-labelledby="rotulo-hora"
          className="grid grid-cols-3 gap-2 sm:grid-cols-4"
        >
          {horarios.map((inicio) => (
            <button
              key={inicio}
              type="button"
              aria-pressed={inicio === valor}
              onClick={() => aoEscolher(inicio)}
              className={cn(
                "min-h-12 cursor-pointer rounded-md border-2 text-lg font-bold tabular-nums transition-colors",
                inicio === valor
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-card hover:bg-muted",
              )}
            >
              {horaNoFuso(inicio, expediente.fuso)}
            </button>
          ))}
        </div>
        {erro && (
          <p role="alert" className="text-sm font-semibold text-destructive">
            {erro}
          </p>
        )}
      </div>
    </div>
  );
}
