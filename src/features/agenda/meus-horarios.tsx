import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { useState, type ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  cancelar,
  ehErroDeHorario,
  lerMeusAgendamentos,
  podeAlterar,
  remarcar,
  rotuloDaSituacao,
  separarAgendamentos,
  valorCobradoCentavos,
  type Agendamento,
} from "@/features/agenda/agendamentos";
import { descreverQuando, type Expediente } from "@/features/agenda/expediente";
import { chavesDeAvaliacoes, lerMinhasAvaliacoes } from "@/features/avaliacoes/banco";
import { DialogoDeAvaliacao } from "@/features/avaliacoes/dialogo-de-avaliacao";
import { Estrelas } from "@/features/avaliacoes/estrelas";
import { SituacaoBadge } from "@/features/agenda/situacao";
import { SeletorDeHorario } from "@/features/agenda/seletor-de-horario";
import { useAgora } from "@/features/agenda/use-funcionamento";
import type { Sessao } from "@/features/conta/sessao";
import { useSair } from "@/features/conta/sair";
import { precoCurtoDeCentavos } from "@/lib/dinheiro";

const CHAVE = ["meus-agendamentos"];
const FUSO_PADRAO = "America/Sao_Paulo";

type Aviso = { tipo: "ok" | "erro"; texto: string };

export function MeusHorarios({
  sessao,
  expediente,
}: {
  sessao: Sessao;
  expediente: Expediente | null;
}) {
  const queryClient = useQueryClient();
  const agora = useAgora();
  const sair = useSair();
  const fuso = expediente?.fuso ?? FUSO_PADRAO;
  const [cancelando, setCancelando] = useState<Agendamento | null>(null);
  const [remarcando, setRemarcando] = useState<Agendamento | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [avaliando, setAvaliando] = useState<Agendamento | null>(null);

  const consulta = useQuery({ queryKey: CHAVE, queryFn: lerMeusAgendamentos });
  const avaliacoes = useQuery({
    queryKey: chavesDeAvaliacoes.minhas,
    queryFn: lerMinhasAvaliacoes,
  });
  const { proximos, historico } = separarAgendamentos(consulta.data ?? [], agora ?? new Date());

  const cancelamento = useMutation({
    mutationFn: cancelar,
    onSuccess: () =>
      setAviso({ tipo: "ok", texto: "Agendamento cancelado. O horário ficou livre." }),
    onError: (erro) => setAviso({ tipo: "erro", texto: erro.message }),
    onSettled: () => {
      setCancelando(null);
      void queryClient.invalidateQueries({ queryKey: CHAVE });
      void queryClient.invalidateQueries({ queryKey: ["ocupados"] });
    },
  });

  return (
    <>
      <div className="mx-auto grid w-full max-w-3xl gap-8 px-5 pb-20 pt-10">
        <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">
          Meus horários
        </h1>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-lg">
            Olá, <strong>{sessao.nome || sessao.email}</strong>.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/cliente/fidelidade">Cartão fidelidade</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/cliente/perfil">Meu perfil</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => void sair()}>
              Sair
            </Button>
          </div>
        </div>

        {aviso && (
          <p
            role={aviso.tipo === "erro" ? "alert" : "status"}
            className={
              aviso.tipo === "erro"
                ? "rounded-md bg-destructive-soft px-4 py-3 text-base font-semibold text-destructive"
                : "rounded-md bg-success-soft px-4 py-3 text-base font-semibold text-success"
            }
          >
            {aviso.texto}
          </p>
        )}

        {consulta.isPending ? (
          <p className="text-base text-muted-foreground">Carregando seus horários.</p>
        ) : consulta.isError ? (
          <div className="grid justify-items-start gap-3 rounded-md border-2 border-dashed border-input p-5">
            <p role="alert" className="text-base font-semibold">
              Não conseguimos carregar seus horários agora.
            </p>
            <Button variant="outline" onClick={() => void consulta.refetch()}>
              Tentar de novo
            </Button>
          </div>
        ) : proximos.length + historico.length === 0 ? (
          <div className="grid justify-items-start gap-4 rounded-md border-2 border-dashed border-input p-6">
            <CalendarDays aria-hidden="true" className="size-8" />
            <p className="text-lg">Você ainda não tem agendamentos.</p>
            <Button asChild>
              <Link to="/agendamento" search={{ service: undefined }}>
                Agendar horário
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <Secao titulo="Próximos">
              {proximos.length === 0 ? (
                <p className="text-base text-muted-foreground">Nenhum horário reservado.</p>
              ) : (
                proximos.map((a) => (
                  <Cartao key={a.id} agendamento={a} fuso={fuso}>
                    {agora && podeAlterar(a, agora) && (
                      <div className="flex flex-wrap gap-2">
                        {expediente && (
                          <Button variant="outline" size="sm" onClick={() => setRemarcando(a)}>
                            Remarcar
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => setCancelando(a)}>
                          Cancelar agendamento
                        </Button>
                      </div>
                    )}
                  </Cartao>
                ))
              )}
            </Secao>
            {historico.length > 0 && (
              <Secao titulo="Histórico">
                {historico.map((a) => (
                  <Cartao key={a.id} agendamento={a} fuso={fuso}>
                    <div className="flex flex-wrap items-center gap-2">
                      {a.situacao === "concluido" &&
                        (avaliacoes.data?.[a.id] !== undefined ? (
                          <Estrelas nota={avaliacoes.data[a.id] ?? 0} />
                        ) : (
                          avaliacoes.isSuccess && (
                            <Button variant="outline" size="sm" onClick={() => setAvaliando(a)}>
                              Avaliar
                              <span className="sr-only">: {a.servicoNome}</span>
                            </Button>
                          )
                        ))}
                      <Button asChild variant="outline" size="sm">
                        <Link to="/agendamento" search={{ service: a.servicoId }}>
                          Agendar de novo
                        </Link>
                      </Button>
                    </div>
                  </Cartao>
                ))}
              </Secao>
            )}
          </>
        )}
      </div>

      <AlertDialog open={!!cancelando} onOpenChange={(aberto) => !aberto && setCancelando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar este agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelando
                ? `${cancelando.servicoNome}, ${descreverQuando(cancelando.inicio, fuso)}. O horário volta a ficar livre para outras pessoas.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter agendamento</AlertDialogCancel>
            <AlertDialogAction
              onClick={(evento) => {
                evento.preventDefault();
                if (cancelando) cancelamento.mutate(cancelando.id);
              }}
            >
              {cancelamento.isPending ? "Cancelando" : "Cancelar agendamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {avaliando && (
        <DialogoDeAvaliacao
          agendamentoId={avaliando.id}
          servico={avaliando.servicoNome}
          aoFechar={() => setAvaliando(null)}
          aoAvaliar={() => {
            setAvaliando(null);
            setAviso({ tipo: "ok", texto: "Obrigado pela avaliação." });
          }}
        />
      )}

      {remarcando && expediente && agora && (
        <DialogoDeRemarcacao
          agendamento={remarcando}
          expediente={expediente}
          agora={agora}
          aoFechar={() => setRemarcando(null)}
          aoConcluir={() => {
            setRemarcando(null);
            setAviso({ tipo: "ok", texto: "Horário remarcado." });
            void queryClient.invalidateQueries({ queryKey: CHAVE });
            void queryClient.invalidateQueries({ queryKey: ["ocupados"] });
          }}
        />
      )}
    </>
  );
}

function DialogoDeRemarcacao({
  agendamento,
  expediente,
  agora,
  aoFechar,
  aoConcluir,
}: {
  agendamento: Agendamento;
  expediente: Expediente;
  agora: Date;
  aoFechar: () => void;
  aoConcluir: () => void;
}) {
  const queryClient = useQueryClient();
  const [inicio, setInicio] = useState<string | null>(null);
  const [erro, setErro] = useState<string | undefined>();
  const troca = useMutation({
    mutationFn: (novoInicio: string) => remarcar(agendamento.id, novoInicio),
    onSuccess: aoConcluir,
    onError: (falha) => {
      setErro(falha.message);
      if (ehErroDeHorario(falha)) {
        void queryClient.invalidateQueries({ queryKey: ["ocupados"] });
        setInicio(null);
      }
    },
  });

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && aoFechar()}>
      <DialogContent className="max-h-dvh overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Remarcar horário</DialogTitle>
          <DialogDescription>
            {agendamento.servicoNome}, hoje marcado para{" "}
            {descreverQuando(agendamento.inicio, expediente.fuso)}.
          </DialogDescription>
        </DialogHeader>
        <SeletorDeHorario
          expediente={expediente}
          agora={agora}
          duracaoMinutos={agendamento.duracaoMinutos}
          valor={inicio}
          aoEscolher={(valor) => {
            setInicio(valor);
            setErro(undefined);
          }}
        />
        {erro && (
          <p role="alert" className="text-base font-semibold text-destructive">
            {erro}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="ghost" onClick={aoFechar}>
            Manter o horário atual
          </Button>
          <Button
            disabled={!inicio || troca.isPending}
            onClick={() => inicio && troca.mutate(inicio)}
          >
            {troca.isPending ? "Remarcando" : "Confirmar novo horário"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="grid gap-3">
      <h2 className="font-display text-2xl font-extrabold">{titulo}</h2>
      <ul className="grid gap-3">{children}</ul>
    </section>
  );
}

function Cartao({
  agendamento,
  fuso,
  children,
}: {
  agendamento: Agendamento;
  fuso: string;
  children: ReactNode;
}) {
  return (
    <li className="grid gap-3 rounded-md border-2 border-foreground bg-card p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="font-display text-xl font-bold leading-tight">
            {agendamento.servicoNome}
          </h3>
          <SituacaoBadge situacao={rotuloDaSituacao(agendamento.situacao)} />
        </div>
        <p className="text-base">{descreverQuando(agendamento.inicio, fuso)}</p>
        <p className="text-sm text-muted-foreground">
          {agendamento.descontoCentavos > 0
            ? `${precoCurtoDeCentavos(valorCobradoCentavos(agendamento))} com desconto, pagos na barbearia`
            : `${precoCurtoDeCentavos(agendamento.precoCentavos)}, pagos na barbearia`}
        </p>
      </div>
      <div>{children}</div>
    </li>
  );
}
