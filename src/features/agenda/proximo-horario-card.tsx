import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { momentoNoFuso, rotuloDoDia } from "@/features/agenda/expediente";
import { useProximoHorario } from "@/features/agenda/use-funcionamento";
import { horaNoFuso } from "@/features/agenda/horarios-livres";
import type { Servico } from "@/features/catalogo/banco";

// Responde "quando tem vaga?" sem o cliente precisar abrir o agendamento.
export function ProximoHorarioCard({ servico }: { servico: Servico | undefined }) {
  const { agora, expediente, proximo, carregando } = useProximoHorario(servico?.duracaoMinutos);
  const primeiro = proximo?.horarios[0];

  let titulo: string;
  if (agora === null || (carregando && expediente !== null)) titulo = "Conferindo a agenda";
  else if (!expediente || !servico) titulo = "Não conseguimos ver a agenda agora";
  else if (proximo && primeiro) {
    const hoje = momentoNoFuso(agora, expediente.fuso).data;
    titulo = `${rotuloDoDia(proximo.dia, hoje)}, ${horaNoFuso(primeiro, expediente.fuso)}`;
  } else titulo = "Sem vaga nos próximos dias";

  const horario = primeiro && expediente ? horaNoFuso(primeiro, expediente.fuso) : null;

  return (
    <section
      aria-labelledby="proximo-horario"
      className="grid justify-items-start gap-1 rounded-md border-2 border-foreground bg-card p-5"
    >
      <h2 id="proximo-horario" className="text-base font-normal text-muted-foreground">
        {servico ? `Próximo horário para ${servico.nome.toLowerCase()}` : "Próximo horário"}
      </h2>
      <p className="font-display text-3xl font-extrabold leading-tight">{titulo}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
        {servico && horario && (
          <Button asChild>
            <Link to="/agendamento" search={{ service: servico.id }}>
              Agendar às {horario}
            </Link>
          </Button>
        )}
        <Button asChild variant="link" className="px-0">
          <Link to="/agendamento" search={{ service: undefined }}>
            {proximo ? "Ver outros dias" : "Ver a agenda"}
          </Link>
        </Button>
      </div>
    </section>
  );
}
