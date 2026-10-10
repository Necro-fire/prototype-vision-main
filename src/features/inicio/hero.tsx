import { Link } from "@tanstack/react-router";

import { Foto } from "@/components/foto";
import { EstadoDeFuncionamento } from "@/components/marca";
import { Button } from "@/components/ui/button";
import { useFuncionamento } from "@/features/agenda/use-funcionamento";
import type { AvaliacoesPublicas } from "@/features/avaliacoes/banco";
import { Estrelas } from "@/features/avaliacoes/estrelas";

// A abertura da página: a frase e os dois caminhos à esquerda, sobre a foto da barbearia, que
// ocupa a direita e some no fundo. O painel de agendamento sobe por cima da base desta seção.
// A nota vem do banco; sem avaliação, a linha não aparece.
export function Hero({ avaliacoes }: { avaliacoes: AvaliacoesPublicas | null }) {
  const { funcionamento } = useFuncionamento();
  const resumo = avaliacoes?.resumo ?? null;

  return (
    <section aria-labelledby="titulo-inicio" className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10 lg:left-[36%]">
        <Foto
          arquivo="cadeira-junto-a-porta"
          alt="Cadeira de barbeiro antiga ao lado de uma porta aberta, com o sol entrando pelo piso de madeira."
          prioridade
          sizes="(min-width: 64rem) 64vw, 100vw"
          className="aspect-auto h-full rounded-none border-0"
        />
        {/* O véu garante o contraste do texto: inteiro no celular, da esquerda para a direita no computador. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-background/80 lg:bg-transparent lg:bg-linear-to-r lg:from-background lg:via-background/55 lg:to-background/10"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-background to-transparent"
        />
      </div>

      <div className="mx-auto w-full max-w-6xl px-5 pb-32 pt-12 sm:pt-16 lg:pb-44 lg:pt-24">
        <div className="grid max-w-2xl content-start gap-6">
          <EstadoDeFuncionamento
            aberto={funcionamento?.aberto ?? false}
            texto={funcionamento?.texto}
          />
          <h1
            id="titulo-inicio"
            className="text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl"
          >
            <span className="block">Escolha o horário.</span>
            <span className="block">A gente corta.</span>
          </h1>
          <p className="max-w-[38ch] text-lg">
            Corte, barba e sobrancelha com horário marcado. Veja quanto custa, escolha um horário
            livre e pague só na barbearia.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href="#agendar">Agendar horário</a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/servicos">Ver serviços</Link>
            </Button>
          </div>

          {resumo && resumo.total > 0 && resumo.media !== null && (
            <Link
              to="/avaliacoes"
              className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-1 justify-self-start underline-offset-4 hover:underline"
            >
              <Estrelas nota={Math.round(resumo.media)} />
              <span className="text-base font-bold tabular-nums">
                {resumo.media.toFixed(1).replace(".", ",")} de 5
              </span>
              <span className="border-l border-line pl-4 text-base text-muted-foreground">
                {resumo.total === 1
                  ? "1 avaliação de cliente"
                  : `${resumo.total} avaliações de clientes`}
              </span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
