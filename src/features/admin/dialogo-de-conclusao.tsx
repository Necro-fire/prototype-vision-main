import { useQuery } from "@tanstack/react-query";
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
import {
  CampoDeCupom,
  cupomVigente,
  type CupomAplicado,
} from "@/features/descontos/campo-de-cupom";
import {
  chavesDeFidelidade,
  lerSaldoDeFidelidade,
  useRegraDeFidelidade,
} from "@/features/fidelidade/banco";
import type { FormaPagamento } from "@/features/financeiro/formas-de-pagamento";
import { SeletorDeForma } from "@/features/financeiro/seletor-de-forma";
import { dinheiroDeCentavos } from "@/lib/dinheiro";
import type { OpcoesDeConclusao } from "./agenda-do-dono";
import type { AgendamentoDoDono } from "./hoje";

// "Como foi o pagamento?": o momento de cobrar. Mostra o que será cobrado (com cupom ou com o
// serviço grátis da fidelidade, se houver) e pede a forma de pagamento quando há valor. O valor
// definitivo, e se o cupom ou o saldo valem, é conferido pelo banco ao concluir.
export function DialogoDeConclusao({
  agendamento,
  pendente,
  aoConfirmar,
  aoFechar,
}: {
  agendamento: AgendamentoDoDono;
  pendente: boolean;
  aoConfirmar: (opcoes: OpcoesDeConclusao) => void;
  aoFechar: () => void;
}) {
  const [forma, setForma] = useState<FormaPagamento | null>(null);
  const [erroDaForma, setErroDaForma] = useState<string | undefined>();
  const [cupomAplicado, setCupomAplicado] = useState<CupomAplicado | null>(null);
  const [resgatar, setResgatar] = useState(false);

  const preco = agendamento.precoCentavos;
  const jaTemDesconto = agendamento.descontoCentavos > 0;
  const regra = useRegraDeFidelidade();
  const clienteId = agendamento.clienteId;
  const podeUsarCartao =
    !jaTemDesconto &&
    clienteId !== null &&
    regra.data?.ativa === true &&
    regra.data.servicoId === agendamento.servicoId;
  const saldo = useQuery({
    queryKey: chavesDeFidelidade.saldo(clienteId),
    queryFn: () => lerSaldoDeFidelidade(clienteId ?? undefined),
    enabled: podeUsarCartao,
  });
  const atendimentosPorPremio = regra.data?.atendimentos ?? 0;
  const cartaoCheio = podeUsarCartao && (saldo.data ?? 0) >= atendimentosPorPremio;

  const cupom = cupomVigente(cupomAplicado, preco);
  const desconto = resgatar
    ? preco
    : jaTemDesconto
      ? agendamento.descontoCentavos
      : (cupom?.descontoCentavos ?? 0);
  const total = preco - desconto;

  function concluir() {
    if (total > 0 && !forma) {
      setErroDaForma("Escolha como o cliente pagou.");
      return;
    }
    const opcoes: OpcoesDeConclusao = {};
    if (total > 0 && forma) opcoes.formaPagamento = forma;
    if (resgatar) opcoes.resgatarFidelidade = true;
    else if (cupom) opcoes.cupom = cupom.codigo;
    aoConfirmar(opcoes);
  }

  return (
    <AlertDialog open onOpenChange={(aberto) => !aberto && aoFechar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Como foi o pagamento?</AlertDialogTitle>
          <AlertDialogDescription>
            {agendamento.clienteNome}, {agendamento.servicoNome}, {dinheiroDeCentavos(preco)}.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {jaTemDesconto ? (
          <p className="text-base font-semibold text-success">
            Desconto da reserva (cupom): {dinheiroDeCentavos(agendamento.descontoCentavos)}
          </p>
        ) : (
          <CampoDeCupom
            id="conclusao-cupom"
            totalCentavos={preco}
            aplicado={cupom}
            aoAplicar={setCupomAplicado}
            aoRemover={() => setCupomAplicado(null)}
            desabilitado={resgatar}
          />
        )}

        {cartaoCheio && (
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border-2 border-input bg-card px-4 py-2 text-base font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring">
            <input
              type="checkbox"
              className="size-5 shrink-0 accent-primary"
              checked={resgatar}
              onChange={(e) => {
                setResgatar(e.target.checked);
                if (e.target.checked) setCupomAplicado(null);
              }}
            />
            <span>
              Serviço grátis pelo cartão fidelidade
              <span className="block text-sm font-normal text-muted-foreground">
                Gasta {atendimentosPorPremio} pontos. Saldo: {saldo.data ?? 0}.
              </span>
            </span>
          </label>
        )}

        <p className="flex items-baseline justify-between gap-3 border-t border-border pt-3 text-base">
          <span>Total a cobrar</span>
          <strong className="font-display text-2xl font-semibold tabular-nums">
            {dinheiroDeCentavos(total)}
          </strong>
        </p>

        {total > 0 ? (
          <SeletorDeForma
            valor={forma}
            aoMudar={(escolhida) => {
              setForma(escolhida);
              setErroDaForma(undefined);
            }}
            {...(erroDaForma ? { erro: erroDaForma } : {})}
          />
        ) : (
          <p className="text-base text-muted-foreground">
            Sem valor a cobrar: não precisa escolher a forma de pagamento.
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(evento) => {
              evento.preventDefault();
              concluir();
            }}
          >
            {pendente ? "Concluindo" : "Concluir atendimento"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
