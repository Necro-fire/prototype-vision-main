import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { tiposAceitos, validarFoto } from "./foto-validacao";
import type { MudancaDeFoto } from "./fotos-do-catalogo";

// A foto no cadastro: mostra a atual (ou a escolhida), deixa trocar e remover. Nada é enviado
// daqui: a escolha só vira envio quando o dono salva o cadastro.
export function CampoDeFoto({
  id,
  nomeDoItem,
  urlAtual,
  mudanca,
  aoMudar,
}: {
  id: string;
  nomeDoItem: string;
  urlAtual: string | null;
  mudanca: MudancaDeFoto;
  aoMudar: (mudanca: MudancaDeFoto) => void;
}) {
  const [erro, setErro] = useState<string | undefined>(undefined);
  const [previa, setPrevia] = useState<string | null>(null);

  // A prévia da foto escolhida vive só enquanto ela é a escolhida.
  const arquivo = mudanca.tipo === "trocar" ? mudanca.arquivo : null;
  useEffect(() => {
    if (!arquivo || typeof URL.createObjectURL !== "function") {
      setPrevia(null);
      return;
    }
    const endereco = URL.createObjectURL(arquivo);
    setPrevia(endereco);
    return () => URL.revokeObjectURL(endereco);
  }, [arquivo]);

  const mostrada = mudanca.tipo === "remover" ? null : (previa ?? (arquivo ? null : urlAtual));
  const temFoto = mudanca.tipo === "trocar" || (mudanca.tipo === "manter" && !!urlAtual);

  return (
    <div className="grid gap-3">
      <Campo
        id={id}
        rotulo="Foto"
        opcional
        ajuda="JPG, PNG ou WebP, até 5 MB. Use uma foto sua ou com licença para uso."
        {...(erro ? { erro } : {})}
      >
        {(props) => (
          <input
            {...props}
            type="file"
            accept={tiposAceitos}
            onChange={(e) => {
              const escolhido = e.target.files?.[0];
              if (!escolhido) return;
              const problema = validarFoto(escolhido);
              setErro(problema ?? undefined);
              if (!problema) aoMudar({ tipo: "trocar", arquivo: escolhido });
              // Deixa escolher o mesmo arquivo de novo depois de um erro.
              e.target.value = "";
            }}
            className="block min-h-11 w-full cursor-pointer rounded-md border-2 border-input bg-card text-base file:mr-3 file:min-h-11 file:cursor-pointer file:border-0 file:bg-muted file:px-4 file:text-base file:font-semibold"
          />
        )}
      </Campo>
      {mostrada && (
        <img
          src={mostrada}
          alt={`Foto de ${nomeDoItem || "este item"}`}
          className="aspect-3/2 w-full max-w-64 rounded-md border border-line bg-muted object-cover"
        />
      )}
      {mudanca.tipo === "remover" && (
        <p className="text-base text-muted-foreground">A foto será removida ao salvar.</p>
      )}
      {mudanca.tipo === "trocar" && (
        <p className="text-base text-muted-foreground">A foto nova é enviada ao salvar.</p>
      )}
      {temFoto && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-self-start"
          onClick={() => {
            setErro(undefined);
            aoMudar({ tipo: "remover" });
          }}
        >
          Remover foto
        </Button>
      )}
    </div>
  );
}
