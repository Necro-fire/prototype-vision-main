import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/section-title";
import { momentoNoFuso } from "@/features/agenda/expediente";
import { diaDaSemanaDe } from "@/features/agenda/horarios-livres";
import { useAgora, useExpediente } from "@/features/agenda/use-funcionamento";
import { useContato } from "@/features/contato/use-contato";
import { cn } from "@/lib/utils";
import { quadroSemanal } from "./quadro-semanal";

// A última dobra: o quadro de horários da semana, com o dia de hoje marcado, e onde fica.
export function Horarios() {
  const expediente = useExpediente();
  const agora = useAgora();
  const contato = useContato();
  const linhas = expediente ? quadroSemanal(expediente) : [];
  const hoje =
    agora && expediente ? diaDaSemanaDe(momentoNoFuso(agora, expediente.fuso).data) : null;

  return (
    <section
      aria-labelledby="horarios"
      className="mx-auto grid w-full max-w-6xl gap-10 border-t border-line px-5 py-16 lg:grid-cols-12 lg:gap-12"
    >
      <div className="grid content-start gap-6 lg:col-span-5">
        <SectionTitle id="horarios">Horário e endereço</SectionTitle>
        <p className="max-w-[40ch] text-lg text-muted-foreground">
          {contato?.endereco ?? "O endereço ainda não foi informado."}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/agendamento" search={{ service: undefined }}>
              Agendar horário
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/contato">Como chegar</Link>
          </Button>
        </div>
      </div>

      <div className="lg:col-span-7">
        {linhas.length === 0 ? (
          <p className="text-lg text-muted-foreground">Horário de atendimento a definir.</p>
        ) : (
          <table className="w-full border-collapse text-left text-lg">
            <caption className="sr-only">Horário de atendimento por dia da semana</caption>
            <tbody>
              {linhas.map((l) => (
                <tr
                  key={l.dia}
                  aria-current={l.dia === hoje ? "date" : undefined}
                  className={cn("border-b border-line", l.dia === hoje && "bg-accent")}
                >
                  <th
                    scope="row"
                    className={cn(
                      "w-44 border-l-4 px-4 py-3 font-bold",
                      l.dia === hoje ? "border-primary" : "border-transparent",
                    )}
                  >
                    {l.nome}
                    {l.dia === hoje && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">hoje</span>
                    )}
                  </th>
                  <td className={cn("py-3 pr-4", l.horas === null && "text-muted-foreground")}>
                    {l.horas ?? "Fechado"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
