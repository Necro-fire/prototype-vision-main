import { Check } from "lucide-react";
import { useId } from "react";

import { cn } from "@/lib/utils";
import { formasDePagamento, type FormaPagamento } from "./formas-de-pagamento";

// Quatro botões grandes para escolher como foi pago. São botões de opção de verdade (radio):
// funciona por teclado e leitor de tela, e o selecionado traz um visto além da cor.
export function SeletorDeForma({
  valor,
  aoMudar,
  rotulo = "Forma de pagamento",
  erro,
}: {
  valor: FormaPagamento | null;
  aoMudar: (forma: FormaPagamento) => void;
  rotulo?: string;
  erro?: string;
}) {
  const nome = useId();
  return (
    <fieldset className="grid gap-2" aria-describedby={erro ? `${nome}-erro` : undefined}>
      <legend className="mb-2 text-base font-semibold">{rotulo}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {formasDePagamento.map((forma) => {
          const selecionada = valor === forma.valor;
          return (
            <label
              key={forma.valor}
              className={cn(
                "flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md border-2 px-3 text-base font-bold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                selecionada
                  ? "border-foreground bg-primary text-primary-foreground"
                  : "border-input bg-card text-foreground hover:bg-muted",
              )}
            >
              <input
                type="radio"
                name={nome}
                value={forma.valor}
                checked={selecionada}
                onChange={() => aoMudar(forma.valor)}
                className="sr-only"
              />
              {selecionada && <Check aria-hidden="true" className="size-5 shrink-0" />}
              {forma.rotulo}
            </label>
          );
        })}
      </div>
      {erro && (
        <p id={`${nome}-erro`} role="alert" className="text-sm font-semibold text-destructive">
          {erro}
        </p>
      )}
    </fieldset>
  );
}
