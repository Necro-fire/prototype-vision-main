import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { rotuloDia } from "@/features/agenda/proximo-horario";
import { useProximoHorario } from "@/features/agenda/use-funcionamento";
import { useShop } from "@/features/demo/shop-provider";

// Responde "quando tem vaga?" sem o cliente precisar abrir o agendamento.
export function ProximoHorarioCard() {
  const { services } = useShop();
  const servico = services.find((s) => s.active);
  const { agora, proximo } = useProximoHorario(servico?.duration);
  const horario = proximo?.times[0];

  return (
    <section
      aria-labelledby="proximo-horario"
      className="grid justify-items-start gap-1 rounded-md border-2 border-foreground bg-card p-5"
    >
      <h2 id="proximo-horario" className="text-base font-normal text-muted-foreground">
        {servico ? `Próximo horário para ${servico.name.toLowerCase()}` : "Próximo horário"}
      </h2>
      <p className="font-display text-3xl font-extrabold leading-tight">
        {agora === null
          ? "Conferindo a agenda"
          : proximo && horario
            ? `${rotuloDia(proximo.date, agora)}, ${horario}`
            : "Sem vaga nos próximos dias"}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
        {servico && proximo && horario && (
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
