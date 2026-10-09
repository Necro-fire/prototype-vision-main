import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Gift } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dataHoraCurta } from "@/lib/datas";
import {
  chavesDeFidelidade,
  lerMeusMovimentos,
  lerSaldoDeFidelidade,
  useRegraDeFidelidade,
  type MovimentoDeFidelidade,
} from "./banco";
import { progressoDoCartao } from "./progresso";

const textoDoMovimento = (m: MovimentoDeFidelidade) =>
  m.motivo === "atendimento"
    ? `+${m.pontos} ponto, atendimento concluído`
    : `${m.pontos} pontos, serviço grátis`;

// O cartão fidelidade do cliente: quantos pontos tem, quanto falta e de onde vieram.
export function CartaoDoCliente({ fuso }: { fuso: string }) {
  const regra = useRegraDeFidelidade();
  const ativa = regra.data?.ativa === true;
  const saldo = useQuery({
    queryKey: chavesDeFidelidade.saldo(null),
    queryFn: () => lerSaldoDeFidelidade(),
    enabled: ativa,
  });
  const movimentos = useQuery({
    queryKey: chavesDeFidelidade.movimentos,
    queryFn: lerMeusMovimentos,
    enabled: ativa,
  });

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-8 px-5 pb-20 pt-10">
      <div className="grid justify-items-start gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/cliente">
            <ArrowLeft /> Meus horários
          </Link>
        </Button>
        <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">
          Cartão fidelidade
        </h1>
      </div>

      {regra.isPending ? (
        <p className="text-base text-muted-foreground">Carregando.</p>
      ) : regra.isError || !regra.data ? (
        <p role="alert" className="text-base font-semibold">
          Não conseguimos carregar o cartão agora. Tente de novo em instantes.
        </p>
      ) : !regra.data.ativa ? (
        <div className="grid justify-items-start gap-4 rounded-md border-2 border-dashed border-input p-6">
          <Gift aria-hidden="true" className="size-8" />
          <p className="text-lg">A barbearia ainda não tem cartão fidelidade.</p>
          <Button asChild>
            <Link to="/agendamento" search={{ service: undefined }}>
              Agendar horário
            </Link>
          </Button>
        </div>
      ) : saldo.isPending ? (
        <p className="text-base text-muted-foreground">Carregando seus pontos.</p>
      ) : saldo.isError ? (
        <p role="alert" className="text-base font-semibold">
          Não conseguimos carregar seus pontos agora. Tente de novo em instantes.
        </p>
      ) : (
        <Cartao
          regra={regra.data}
          saldo={saldo.data}
          movimentos={movimentos.data ?? []}
          fuso={fuso}
        />
      )}
    </div>
  );
}

function Cartao({
  regra,
  saldo,
  movimentos,
  fuso,
}: {
  regra: NonNullable<ReturnType<typeof useRegraDeFidelidade>["data"]>;
  saldo: number;
  movimentos: MovimentoDeFidelidade[];
  fuso: string;
}) {
  const p = progressoDoCartao(saldo, regra.atendimentos);
  const premio = regra.servicoNome ?? "um serviço";
  return (
    <>
      <section
        aria-label="Seus pontos"
        className="grid gap-4 rounded-md border-2 border-foreground bg-card p-5"
      >
        <p className="font-display text-3xl font-extrabold leading-tight">
          {p.saldo} {p.saldo === 1 ? "ponto" : "pontos"}
        </p>
        <div
          role="progressbar"
          aria-label="Progresso para o serviço grátis"
          aria-valuemin={0}
          aria-valuemax={p.porPremio}
          aria-valuenow={p.carimbos}
          aria-valuetext={`${p.carimbos} de ${p.porPremio} atendimentos`}
          className="h-5 overflow-hidden rounded-md border-2 border-foreground bg-muted"
        >
          <div
            className="h-full bg-primary"
            style={{ width: `${(p.carimbos / p.porPremio) * 100}%` }}
          />
        </div>
        <p className="text-base">
          {p.carimbos} de {p.porPremio} atendimentos
        </p>
        {p.podeResgatar ? (
          <p role="status" className="text-lg font-semibold text-success">
            {p.premiosDisponiveis > 1
              ? `Você tem ${p.premiosDisponiveis} atendimentos de ${premio} de graça.`
              : `Você ganhou ${premio} de graça.`}{" "}
            Avise na sua próxima visita.
          </p>
        ) : (
          <p className="text-lg">
            {p.faltam === 1 ? "Falta 1 atendimento" : `Faltam ${p.faltam} atendimentos`} para ganhar{" "}
            {premio} de graça.
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Cada atendimento concluído vale um ponto. Horários cancelados e faltas não contam.
        </p>
      </section>

      <section aria-label="Histórico de pontos" className="grid gap-3">
        <h2 className="font-display text-2xl font-extrabold">Histórico</h2>
        {movimentos.length === 0 ? (
          <p className="text-base text-muted-foreground">
            Nenhum ponto ainda. O primeiro vem no próximo atendimento concluído.
          </p>
        ) : (
          <ul className="grid gap-2">
            {movimentos.map((m) => (
              <li
                key={`${m.criadoEm}-${m.motivo}`}
                className="flex flex-wrap justify-between gap-x-4 rounded-md border-2 border-border bg-card px-4 py-3 text-base"
              >
                <span className="font-semibold">{textoDoMovimento(m)}</span>
                <span className="text-muted-foreground">{dataHoraCurta(m.criadoEm, fuso)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
