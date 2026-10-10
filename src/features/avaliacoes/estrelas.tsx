import { Star } from "lucide-react";
import { useId } from "react";

import { cn } from "@/lib/utils";

// A estrela cheia é dourada e sólida; a vazia é só o contorno, em cinza. A diferença está na
// forma, não só na cor.
const estrela = (cheia: boolean, tamanho: string) => (
  <Star
    aria-hidden="true"
    className={cn(
      tamanho,
      "shrink-0",
      cheia ? "fill-primary stroke-primary" : "fill-transparent stroke-muted-foreground",
    )}
  />
);

export function Estrelas({ nota, tamanho = "size-5" }: { nota: number; tamanho?: string }) {
  return (
    <span
      role="img"
      aria-label={`${nota} de 5 estrelas`}
      className="inline-flex items-center gap-0.5"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n}>{estrela(n <= nota, tamanho)}</span>
      ))}
    </span>
  );
}

// Nota média em destaque: número grande, estrelas e o total de avaliações. Serve ao herói, aos
// depoimentos e ao painel.
export function ResumoDaNota({
  media,
  total,
  tamanho = "md",
}: {
  media: number;
  total: number;
  tamanho?: "md" | "lg";
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <p
        className={cn(
          "font-display font-bold leading-none tabular-nums",
          tamanho === "lg" ? "text-6xl" : "text-4xl",
        )}
      >
        {media.toFixed(1).replace(".", ",")}
      </p>
      <div className="grid gap-1">
        <Estrelas nota={Math.round(media)} tamanho={tamanho === "lg" ? "size-6" : "size-5"} />
        <p className="text-sm text-muted-foreground">
          {total === 1 ? "1 avaliação" : `${total} avaliações`}
        </p>
      </div>
    </div>
  );
}

// Cinco botões de opção (radio) de 1 a 5 estrelas: funciona por teclado e leitor de tela.
export function SeletorDeNota({
  valor,
  aoMudar,
  erro,
}: {
  valor: number;
  aoMudar: (nota: number) => void;
  erro?: string;
}) {
  const nome = useId();
  return (
    <fieldset className="grid gap-2" aria-describedby={erro ? `${nome}-erro` : undefined}>
      <legend className="mb-1 text-base font-semibold">Sua nota</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className="grid size-12 cursor-pointer place-items-center rounded-md hover:bg-white/5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring"
          >
            <input
              type="radio"
              name={nome}
              value={n}
              checked={valor === n}
              onChange={() => aoMudar(n)}
              className="sr-only"
            />
            <span className="sr-only">{n === 1 ? "1 estrela" : `${n} estrelas`}</span>
            {estrela(n <= valor, "size-9")}
          </label>
        ))}
      </div>
      {erro && (
        <p id={`${nome}-erro`} role="alert" className="text-sm font-semibold text-destructive">
          {erro}
        </p>
      )}
    </fieldset>
  );
}
