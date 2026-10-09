import { Link } from "@tanstack/react-router";
import { MessageSquareText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dataCurta } from "@/lib/datas";
import type { AvaliacoesPublicas } from "./banco";
import { Estrelas } from "./estrelas";

const mediaEmTexto = (media: number) => media.toFixed(1).replace(".", ",");

// O dia em que a avaliação foi feita, como data do calendário no fuso da barbearia.
const diaDaAvaliacao = (instante: string, fuso: string) =>
  new Date(instante).toLocaleDateString("sv-SE", { timeZone: fuso });

// O que os clientes dizem: média, total e as avaliações publicadas.
export function PaginaDeAvaliacoes({
  dados,
  fuso = "America/Sao_Paulo",
}: {
  dados: AvaliacoesPublicas | null;
  fuso?: string;
}) {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-8 px-5 pb-20 pt-10">
      <header className="grid gap-2">
        <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">
          Avaliações
        </h1>
        <p className="text-lg text-muted-foreground">
          O que os clientes disseram depois do atendimento. Só avalia quem foi atendido.
        </p>
      </header>

      {dados === null ? (
        <p role="alert" className="text-base font-semibold">
          Não conseguimos carregar as avaliações agora. Tente de novo em instantes.
        </p>
      ) : dados.resumo.total === 0 || dados.resumo.media === null ? (
        <div className="grid justify-items-start gap-4 rounded-md border-2 border-dashed border-input p-6">
          <MessageSquareText aria-hidden="true" className="size-8" />
          <p className="text-lg">Ainda não há avaliações. A sua pode ser a primeira.</p>
          <Button asChild>
            <Link to="/agendamento" search={{ service: undefined }}>
              Agendar horário
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <section
            aria-label="Nota média"
            className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border-2 border-foreground bg-card p-5"
          >
            <p className="font-display text-5xl font-extrabold tabular-nums">
              {mediaEmTexto(dados.resumo.media)}
            </p>
            <div className="grid gap-1">
              <Estrelas nota={Math.round(dados.resumo.media)} tamanho="size-6" />
              <p className="text-base">
                {dados.resumo.total === 1 ? "1 avaliação" : `${dados.resumo.total} avaliações`}
              </p>
            </div>
          </section>

          <section aria-label="Avaliações dos clientes" className="grid gap-3">
            <ul className="grid gap-3">
              {dados.avaliacoes.map((a) => (
                <li
                  key={`${a.criadaEm}-${a.autor}`}
                  className="grid gap-2 rounded-md border-2 border-border bg-card p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Estrelas nota={a.nota} />
                    <p className="text-sm text-muted-foreground">
                      <strong className="font-semibold text-foreground">{a.autor}</strong>,{" "}
                      {dataCurta(diaDaAvaliacao(a.criadaEm, fuso))}
                    </p>
                  </div>
                  {a.comentario && <p className="text-base">{a.comentario}</p>}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
