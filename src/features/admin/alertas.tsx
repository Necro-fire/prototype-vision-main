import { EstadoCarregando } from "@/components/ui/carregando";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarClock, CalendarPlus, CalendarX, Clock, Mail, Star } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { dataHoraCurta } from "@/lib/datas";
import { useExpediente } from "@/features/agenda/use-funcionamento";
import {
  chavesDeAlertas,
  marcarComoLido,
  marcarTodosComoLidos,
  reenviarEmail,
  useAlertas,
  useEmailsComProblema,
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
  email_falhou: { rotulo: "E-mail não enviado", icone: Mail },
  nova_avaliacao: { rotulo: "Nova avaliação", icone: Star },
};

const modelosDeEmail: Record<string, string> = {
  confirmacao: "Confirmação",
  lembrete: "Lembrete",
  remarcacao: "Remarcação",
  cancelamento: "Cancelamento",
};

// O histórico do sino: o que aconteceu, quando, e o que ainda não foi lido.
export function Alertas() {
  const queryClient = useQueryClient();
  const fuso = useExpediente()?.fuso ?? FUSO_PADRAO;
  const consulta = useAlertas();
  const emailsComProblema = useEmailsComProblema();
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = () =>
    void queryClient.invalidateQueries({ queryKey: chavesDeAlertas.alertas });
  const tentarDeNovo = useMutation({
    mutationFn: reenviarEmail,
    onError: (e) => setErro(e.message),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: chavesDeAlertas.emails }),
  });
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
        <div className="grid justify-items-start gap-3 rounded-xl border border-dashed border-line bg-card/40 p-5">
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
        <EstadoCarregando texto="Carregando." />
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
      {(emailsComProblema.data?.length ?? 0) > 0 && (
        <section
          aria-labelledby="emails-com-problema"
          className="grid gap-3 rounded-md border-2 border-destructive p-4"
        >
          <h3 id="emails-com-problema" className="font-display text-xl font-bold">
            E-mails que não saíram
          </h3>
          <p className="text-base text-muted-foreground">
            O envio falhou várias vezes. O cliente não recebeu o aviso.
          </p>
          <ul aria-label="E-mails que não saíram" className="grid gap-3">
            {emailsComProblema.data?.map((e) => (
              <li
                key={e.id}
                className="grid gap-2 border-t border-border pt-3 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="grid gap-0.5">
                  <p className="text-base font-semibold">
                    {modelosDeEmail[e.modelo] ?? e.modelo} para {e.destinatario}
                  </p>
                  {e.erro && <p className="text-sm text-muted-foreground">Motivo: {e.erro}</p>}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={tentarDeNovo.isPending}
                  onClick={() => {
                    setErro(null);
                    tentarDeNovo.mutate(e.id);
                  }}
                >
                  Tentar de novo
                  <span className="sr-only">
                    : {modelosDeEmail[e.modelo] ?? e.modelo} para {e.destinatario}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        </section>
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
                  naoLido ? "border-line bg-card" : "border-border bg-transparent",
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
