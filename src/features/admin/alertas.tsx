import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarClock, CalendarPlus, CalendarX, Clock } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { dataHoraCurta } from "@/lib/datas";
import { useExpediente } from "@/features/agenda/use-funcionamento";
import {
  chavesDeAlertas,
  marcarComoLido,
  marcarTodosComoLidos,
  useAlertas,
  type TipoDeAlerta,
} from "./alertas-do-dono";
import { EstadoVazio } from "./componentes";
import { PaginaAdmin } from "./pagina-admin";
import { cn } from "@/lib/utils";

const FUSO_PADRAO = "America/Sao_Paulo";

const tipos: Record<TipoDeAlerta, { rotulo: string; icone: typeof Bell }> = {
  novo_agendamento: { rotulo: "Novo agendamento", icone: CalendarPlus },
  cancelamento: { rotulo: "Cancelamento", icone: CalendarX },
  remarcacao: { rotulo: "Remarcação", icone: CalendarClock },
  falta_sem_registro: { rotulo: "Sem registro", icone: Clock },
};

// O histórico do sino: o que aconteceu, quando, e o que ainda não foi lido.
export function Alertas() {
  const queryClient = useQueryClient();
  const fuso = useExpediente()?.fuso ?? FUSO_PADRAO;
  const consulta = useAlertas();
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = () =>
    void queryClient.invalidateQueries({ queryKey: chavesDeAlertas.alertas });
  const ler = useMutation({
    mutationFn: marcarComoLido,
    onError: (e) => setErro(e.message),
    onSettled: recarregar,
  });
  const lerTodos = useMutation({
    mutationFn: marcarTodosComoLidos,
    onError: (e) => setErro(e.message),
    onSettled: recarregar,
  });

  if (consulta.isError) {
    return (
      <PaginaAdmin module="alertas">
        <div className="grid justify-items-start gap-3 rounded-md border-2 border-dashed border-input p-5">
          <p role="alert" className="text-base font-semibold">
            Não conseguimos carregar os alertas agora.
          </p>
          <Button variant="outline" onClick={() => void consulta.refetch()}>
            Tentar de novo
          </Button>
        </div>
      </PaginaAdmin>
    );
  }
  if (consulta.isPending) {
    return (
      <PaginaAdmin module="alertas">
        <p className="text-base text-muted-foreground">Carregando.</p>
      </PaginaAdmin>
    );
  }

  const naoLidos = consulta.data.filter((a) => a.lidoEm === null).length;

  return (
    <PaginaAdmin
      module="alertas"
      action={
        <Button
          variant="outline"
          disabled={naoLidos === 0 || lerTodos.isPending}
          onClick={() => {
            setErro(null);
            lerTodos.mutate();
          }}
        >
          Marcar todos como lidos
        </Button>
      }
    >
      {erro && (
        <p role="alert" className="text-base font-semibold text-destructive">
          {erro}
        </p>
      )}
      {consulta.data.length === 0 ? (
        <EstadoVazio
          icone={Bell}
          titulo="Nenhum alerta por enquanto."
          texto="Quando um cliente agendar, remarcar ou cancelar, o aviso aparece aqui na hora."
        />
      ) : (
        <ul aria-label="Alertas" className="grid gap-3">
          {consulta.data.map((a) => {
            const { rotulo, icone: Icone } = tipos[a.tipo];
            const naoLido = a.lidoEm === null;
            return (
              <li
                key={a.id}
                className={cn(
                  "grid gap-2 rounded-md border-2 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center",
                  naoLido ? "border-foreground bg-card" : "border-border bg-transparent",
                )}
              >
                <Icone aria-hidden="true" className="size-6" />
                <div className="grid gap-0.5">
                  <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                    <strong className="font-semibold text-foreground">{rotulo}</strong>
                    {naoLido && <span className="font-semibold text-info">Novo</span>}
                    <span>{dataHoraCurta(a.criadoEm, fuso)}</span>
                  </p>
                  <p className="text-base">{a.texto}</p>
                </div>
                {naoLido && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={ler.isPending}
                    onClick={() => {
                      setErro(null);
                      ler.mutate(a.id);
                    }}
                  >
                    Marcar como lido
                    <span className="sr-only">: {a.texto}</span>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </PaginaAdmin>
  );
}
