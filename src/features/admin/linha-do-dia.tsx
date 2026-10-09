import { rotuloDaSituacao } from "@/features/agenda/agendamentos";
import { horaNoFuso } from "@/features/agenda/horarios-livres";
import { SituacaoBadge } from "@/features/agenda/situacao";
import { precoCurtoDeCentavos } from "@/lib/dinheiro";
import { AcoesDoAgendamento } from "./acoes-do-agendamento";
import type { AgendamentoDoDono } from "./hoje";

// Um horário do dia, com a situação e os botões para avançar.
export function LinhaDoDia({
  agendamento: a,
  agora,
  fuso,
}: {
  agendamento: AgendamentoDoDono;
  agora: Date;
  fuso: string;
}) {
  const encerrado = ["concluido", "cancelado", "nao_compareceu"].includes(a.situacao);
  return (
    <li
      className={`grid gap-3 rounded-md border-2 border-foreground bg-card p-4 sm:grid-cols-[5rem_1fr_auto] sm:items-center ${encerrado ? "opacity-75" : ""}`}
    >
      <p className="font-display text-3xl font-extrabold leading-none tabular-nums">
        {horaNoFuso(a.inicio, fuso)}
      </p>
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="font-display text-xl font-bold leading-tight">{a.clienteNome}</h3>
          <SituacaoBadge situacao={rotuloDaSituacao(a.situacao)} />
        </div>
        <p className="text-base">
          {a.servicoNome}, {a.duracaoMinutos} min, {precoCurtoDeCentavos(a.precoCentavos)}
        </p>
        <p className="text-sm text-muted-foreground">{a.clienteCelular}</p>
        {a.observacao && <p className="text-sm">Obs.: {a.observacao}</p>}
      </div>
      <AcoesDoAgendamento agendamento={a} agora={agora} fuso={fuso} />
    </li>
  );
}
