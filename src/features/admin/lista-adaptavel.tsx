import type { ReactNode } from "react";

import { useTelaGrande } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

export type Coluna<T> = {
  rotulo: string;
  render: (linha: T) => ReactNode;
  // No celular a coluna principal vira o título do cartão; as demais viram "rótulo: valor".
  principal?: boolean;
  alinharADireita?: boolean;
};

// Tabela no computador, lista de cartões no celular: sem rolagem para os lados.
export function ListaAdaptavel<T>({
  colunas,
  linhas,
  chave,
  descricao,
  vazio,
}: {
  colunas: Coluna<T>[];
  linhas: T[];
  chave: (linha: T) => string;
  descricao: string;
  vazio: ReactNode;
}) {
  const telaGrande = useTelaGrande();
  if (linhas.length === 0) return <>{vazio}</>;

  if (telaGrande) {
    return (
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full border-collapse text-left text-base">
          <caption className="sr-only">{descricao}</caption>
          <thead>
            <tr className="border-b border-line bg-muted">
              {colunas.map((c) => (
                <th
                  key={c.rotulo}
                  scope="col"
                  className={cn(
                    "px-4 py-3 text-sm font-semibold text-muted-foreground",
                    c.alinharADireita && "text-right",
                  )}
                >
                  {c.rotulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {linhas.map((linha) => (
              <tr key={chave(linha)} className="transition-colors hover:bg-accent/60">
                {colunas.map((c) => (
                  <td
                    key={c.rotulo}
                    className={cn("px-4 py-3 align-middle", c.alinharADireita && "text-right")}
                  >
                    {c.render(linha)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const principal = colunas.find((c) => c.principal) ?? colunas[0];
  const demais = colunas.filter((c) => c !== principal);
  return (
    <ul aria-label={descricao} className="grid gap-3">
      {linhas.map((linha) => (
        <li key={chave(linha)} className="grid gap-2 rounded-xl border border-line bg-card p-4">
          {principal && <div className="text-lg font-semibold">{principal.render(linha)}</div>}
          <dl className="grid gap-1.5">
            {demais.map((c) => (
              <div key={c.rotulo} className="flex items-center justify-between gap-3">
                <dt className="text-sm text-muted-foreground">{c.rotulo}</dt>
                <dd className="text-right text-base">{c.render(linha)}</dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}
