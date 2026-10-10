import { Link } from "@tanstack/react-router";
import { Gift, Scissors } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRegraDeFidelidade } from "@/features/fidelidade/banco";
import { marcasDoCartao } from "./selecao";

// O bloco de oferta: o cartão fidelidade, desenhado como o cartão de papel de carimbos. É a
// única oferta que o sistema sabe fazer valer sozinho, então só aparece quando está ativa.
export function OfertaFidelidade() {
  const regra = useRegraDeFidelidade();
  if (!regra.data?.ativa) return null;
  const { atendimentos, servicoNome } = regra.data;
  const marcas = marcasDoCartao(atendimentos);
  const premio = servicoNome ?? "um serviço";

  return (
    <section aria-labelledby="oferta" className="mx-auto w-full max-w-6xl px-5 pb-16">
      <div className="grid items-center gap-8 border border-t-4 border-line border-t-primary bg-card p-6 sm:p-10 lg:grid-cols-12">
        <div className="grid content-start gap-4 lg:col-span-7">
          <h2 id="oferta" className="text-4xl font-semibold leading-[0.95] sm:text-5xl">
            {atendimentos === 1
              ? `Cada atendimento vale ${premio} grátis`
              : `A cada ${atendimentos} atendimentos, ${premio} grátis`}
          </h2>
          <p className="max-w-[44ch] text-lg text-muted-foreground">
            Cada atendimento concluído vira um ponto. Na sua conta você vê quanto falta.
          </p>
          <div>
            <Button asChild>
              <Link to="/cliente/fidelidade">Ver meu cartão</Link>
            </Button>
          </div>
        </div>

        <ol
          aria-label={`Cartão com ${atendimentos} marcas`}
          className="grid grid-cols-6 gap-2 lg:col-span-5 lg:grid-cols-4"
        >
          {Array.from({ length: marcas }, (_, i) => {
            const ultimo = i === marcas - 1;
            return (
              <li
                key={i}
                aria-hidden="true"
                className={
                  ultimo
                    ? "grid aspect-square place-items-center rounded-sm bg-primary text-primary-foreground"
                    : "grid aspect-square place-items-center rounded-sm border border-dashed border-input text-muted-foreground"
                }
              >
                {ultimo ? <Gift className="size-6" /> : <Scissors className="size-5" />}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
