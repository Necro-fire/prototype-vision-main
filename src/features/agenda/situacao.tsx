import { CalendarClock, CircleCheck, Scissors, UserX, X } from "lucide-react";
import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";

type Variante = NonNullable<ComponentProps<typeof Badge>["variant"]>;

// Cada situação tem cor, ícone e nome: a cor sozinha não basta para quem não a enxerga.
const situacoes: Record<string, { variante: Variante; icone: typeof X }> = {
  Agendado: { variante: "infoSoft", icone: CalendarClock },
  Confirmado: { variante: "info", icone: CircleCheck },
  "Em atendimento": { variante: "warning", icone: Scissors },
  Concluído: { variante: "success", icone: CircleCheck },
  Cancelado: { variante: "neutral", icone: X },
  "Não compareceu": { variante: "destructive", icone: UserX },
};

export function SituacaoBadge({ situacao }: { situacao: string }) {
  const { variante, icone: Icone } = situacoes[situacao] ?? situacoes["Agendado"]!;
  return (
    <Badge variant={variante}>
      <Icone aria-hidden="true" />
      {situacao}
    </Badge>
  );
}

// Situações em que o horário ainda está reservado.
export const situacoesAtivas = ["Agendado", "Confirmado", "Em atendimento"];
