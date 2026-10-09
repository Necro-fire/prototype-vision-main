import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

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
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { rotuloDaSituacao, type Situacao } from "@/features/agenda/agendamentos";
import type { FormaPagamento } from "@/features/financeiro/formas-de-pagamento";
import { SeletorDeForma } from "@/features/financeiro/seletor-de-forma";
import { dataHoraCurta } from "@/lib/datas";
import { dinheiroDeCentavos } from "@/lib/dinheiro";
import { chavesDoDono, lerEventos, mudarSituacao } from "./agenda-do-dono";
import { chavesDoCaixa } from "./caixa-do-dono";
import type { AgendamentoDoDono } from "./hoje";
import { acaoPrincipal, proximasSituacoes, rotuloDaAcao } from "./situacoes";

// Os botões que levam o agendamento ao próximo passo: o principal em um toque, os demais ao lado.
// Cancelar pede confirmação, porque libera o horário para outras pessoas. Concluir pede a forma
// de pagamento (regra F4), porque é aí que o dinheiro entra no caixa.
export function AcoesDoAgendamento({
  agendamento,
  agora,
  fuso,
}: {
  agendamento: AgendamentoDoDono;
  agora: Date;
  fuso: string;
}) {
  const queryClient = useQueryClient();
  const [erro, setErro] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [concluindo, setConcluindo] = useState(false);
  const [forma, setForma] = useState<FormaPagamento | null>(null);
  const [erroDaForma, setErroDaForma] = useState<string | undefined>();
  const [historico, setHistorico] = useState(false);

  const mudanca = useMutation({
    mutationFn: ({ para, forma }: { para: Situacao; forma?: FormaPagamento }) =>
      mudarSituacao(agendamento.id, para, forma),
    onMutate: () => setErro(null),
    onError: (falha) => setErro(falha.message),
    onSettled: () => {
      setCancelando(false);
      setConcluindo(false);
      void queryClient.invalidateQueries({ queryKey: chavesDoDono.agendamentos });
      void queryClient.invalidateQueries({ queryKey: chavesDoCaixa.todos });
      void queryClient.invalidateQueries({ queryKey: chavesDoDono.eventos(agendamento.id) });
    },
  });

  const disponiveis = proximasSituacoes(agendamento.situacao, agendamento.inicio, agora);
  const principal = acaoPrincipal(agendamento.situacao);
  const outras = disponiveis.filter((s) => s !== principal);
  const nome = agendamento.clienteNome;

  function pedir(para: Situacao) {
    if (para === "cancelado") setCancelando(true);
    else if (para === "concluido") {
      setForma(null);
      setErroDaForma(undefined);
      setConcluindo(true);
    } else mudanca.mutate({ para });
  }

  function concluir() {
    if (!forma) {
      setErroDaForma("Escolha como o cliente pagou.");
      return;
    }
    mudanca.mutate({ para: "concluido", forma });
  }

  return (
    <div className="grid justify-items-start gap-2">
      <div className="flex flex-wrap gap-2">
        {principal && disponiveis.includes(principal) && (
          <Button
            size="sm"
            disabled={mudanca.isPending}
            aria-label={`${rotuloDaAcao[principal]}: ${nome}`}
            onClick={() => pedir(principal)}
          >
            {rotuloDaAcao[principal]}
          </Button>
        )}
        {outras.map((para) => (
          <Button
            key={para}
            size="sm"
            variant="outline"
            disabled={mudanca.isPending}
            aria-label={`${rotuloDaAcao[para]}: ${nome}`}
            onClick={() => pedir(para)}
          >
            {rotuloDaAcao[para]}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => setHistorico(true)}>
          Histórico
          <span className="sr-only">: {nome}</span>
        </Button>
      </div>
      {erro && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {erro}
        </p>
      )}

      <AlertDialog open={cancelando} onOpenChange={setCancelando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar este horário?</AlertDialogTitle>
            <AlertDialogDescription>
              {nome}, {agendamento.servicoNome}, {dataHoraCurta(agendamento.inicio, fuso)}. O
              horário volta a ficar livre no site.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter horário</AlertDialogCancel>
            <AlertDialogAction
              onClick={(evento) => {
                evento.preventDefault();
                mudanca.mutate({ para: "cancelado" });
              }}
            >
              {mudanca.isPending ? "Cancelando" : "Cancelar horário"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={concluindo} onOpenChange={setConcluindo}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Como foi o pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {nome}, {agendamento.servicoNome}, {dinheiroDeCentavos(agendamento.precoCentavos)}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <SeletorDeForma
            valor={forma}
            aoMudar={(escolhida) => {
              setForma(escolhida);
              setErroDaForma(undefined);
            }}
            {...(erroDaForma ? { erro: erroDaForma } : {})}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(evento) => {
                evento.preventDefault();
                concluir();
              }}
            >
              {mudanca.isPending ? "Concluindo" : "Concluir atendimento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {historico && (
        <HistoricoDoAgendamento
          agendamento={agendamento}
          fuso={fuso}
          aoFechar={() => setHistorico(false)}
        />
      )}
    </div>
  );
}

function HistoricoDoAgendamento({
  agendamento,
  fuso,
  aoFechar,
}: {
  agendamento: AgendamentoDoDono;
  fuso: string;
  aoFechar: () => void;
}) {
  const consulta = useQuery({
    queryKey: chavesDoDono.eventos(agendamento.id),
    queryFn: () => lerEventos(agendamento.id),
  });
  return (
    <Dialog open onOpenChange={(aberto) => !aberto && aoFechar()}>
      <DialogContent>
        <DialogTitle>Histórico de {agendamento.clienteNome}</DialogTitle>
        <DialogDescription>
          {agendamento.servicoNome}, {dataHoraCurta(agendamento.inicio, fuso)}.
        </DialogDescription>
        {consulta.isPending ? (
          <p className="text-base text-muted-foreground">Carregando.</p>
        ) : consulta.isError ? (
          <p role="alert" className="text-base font-semibold text-destructive">
            Não conseguimos carregar o histórico.
          </p>
        ) : consulta.data.length === 0 ? (
          <p className="text-base text-muted-foreground">Nenhuma mudança registrada.</p>
        ) : (
          <ol className="grid gap-2">
            {consulta.data.map((e) => (
              <li
                key={`${e.em}-${e.para}`}
                className="rounded-md border-2 border-border p-3 text-base"
              >
                <strong className="font-semibold">
                  {e.de
                    ? `${rotuloDaSituacao(e.de)} para ${rotuloDaSituacao(e.para)}`
                    : rotuloDaSituacao(e.para)}
                </strong>
                <span className="block text-sm text-muted-foreground">
                  {dataHoraCurta(e.em, fuso)}
                  {e.por ? `, por ${e.por}` : ""}
                </span>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
