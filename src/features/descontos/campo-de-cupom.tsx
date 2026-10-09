import { useMutation } from "@tanstack/react-query";
import { Tag, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Input } from "@/components/ui/input";
import { dinheiroDeCentavos } from "@/lib/dinheiro";
import { normalizarCodigo, preverDesconto } from "./cupons";

export type CupomAplicado = {
  codigo: string;
  descontoCentavos: number;
  // O total sobre o qual o desconto foi calculado: se o total mudar, o cupom precisa ser aplicado
  // de novo, porque o desconto de um percentual muda junto.
  totalCentavos: number;
};

// O cupom só vale para o total sobre o qual foi calculado.
export const cupomVigente = (aplicado: CupomAplicado | null, totalCentavos: number) =>
  aplicado && aplicado.totalCentavos === totalCentavos ? aplicado : null;

// Campo "Cupom" com botão Aplicar. Mostra na hora quanto o cupom abate; o valor definitivo é
// calculado pelo banco ao confirmar.
export function CampoDeCupom({
  id,
  totalCentavos,
  aplicado,
  aoAplicar,
  aoRemover,
  desabilitado = false,
}: {
  id: string;
  totalCentavos: number;
  aplicado: CupomAplicado | null;
  aoAplicar: (cupom: CupomAplicado) => void;
  aoRemover: () => void;
  desabilitado?: boolean;
}) {
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | undefined>();

  const previa = useMutation({
    mutationFn: (codigo: string) => preverDesconto(codigo, totalCentavos),
    onSuccess: (descontoCentavos, codigo) => {
      setErro(undefined);
      setTexto("");
      aoAplicar({ codigo, descontoCentavos, totalCentavos });
    },
    onError: (falha) => setErro(falha.message),
  });

  function aplicar() {
    const codigo = normalizarCodigo(texto);
    if (!codigo) {
      setErro("Digite o código do cupom.");
      return;
    }
    setErro(undefined);
    previa.mutate(codigo);
  }

  if (aplicado) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border-2 border-success bg-success-soft px-4 py-2">
        <p role="status" className="flex items-center gap-2 text-base font-semibold text-success">
          <Tag aria-hidden="true" className="size-5 shrink-0" />
          Cupom {aplicado.codigo}: desconto de {dinheiroDeCentavos(aplicado.descontoCentavos)}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={aoRemover}
          disabled={desabilitado}
          aria-label={`Remover o cupom ${aplicado.codigo}`}
        >
          <X /> Remover
        </Button>
      </div>
    );
  }

  return (
    <Campo id={id} rotulo="Cupom" opcional {...(erro ? { erro } : {})}>
      {(props) => (
        <div className="flex flex-wrap gap-2">
          <Input
            {...props}
            className="min-w-0 flex-1 uppercase"
            autoComplete="off"
            maxLength={20}
            value={texto}
            disabled={desabilitado}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                aplicar();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={desabilitado || previa.isPending}
            onClick={aplicar}
          >
            {previa.isPending ? "Conferindo" : "Aplicar"}
          </Button>
        </div>
      )}
    </Campo>
  );
}
