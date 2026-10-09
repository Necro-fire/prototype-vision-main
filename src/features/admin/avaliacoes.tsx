import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquareText } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useExpediente } from "@/features/agenda/use-funcionamento";
import {
  chavesDeAvaliacoes,
  lerAvaliacoesDoDono,
  moderarAvaliacao,
} from "@/features/avaliacoes/banco";
import { Estrelas } from "@/features/avaliacoes/estrelas";
import { dataHoraCurta } from "@/lib/datas";
import { EstadoVazio, Indicador, SecaoAdmin } from "./componentes";
import { PaginaAdmin } from "./pagina-admin";

const FUSO_PADRAO = "America/Sao_Paulo";

// As avaliações dos clientes. Entram publicadas; o dono oculta o que não deve aparecer no site
// (ofensa, dado pessoal) e pode voltar atrás. Nada se apaga.
export function Avaliacoes() {
  const queryClient = useQueryClient();
  const fuso = useExpediente()?.fuso ?? FUSO_PADRAO;
  const consulta = useQuery({ queryKey: chavesDeAvaliacoes.doDono, queryFn: lerAvaliacoesDoDono });
  const [erro, setErro] = useState<string | null>(null);

  const moderar = useMutation({
    mutationFn: ({ id, publicada }: { id: string; publicada: boolean }) =>
      moderarAvaliacao(id, publicada),
    onMutate: () => setErro(null),
    onError: (e) => setErro(e.message),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: chavesDeAvaliacoes.doDono }),
  });

  if (consulta.isPending) {
    return (
      <PaginaAdmin module="avaliacoes">
        <p className="text-base text-muted-foreground">Carregando.</p>
      </PaginaAdmin>
    );
  }
  if (consulta.isError) {
    return (
      <PaginaAdmin module="avaliacoes">
        <div className="grid justify-items-start gap-3 rounded-md border-2 border-dashed border-input p-5">
          <p role="alert" className="text-base font-semibold">
            Não conseguimos carregar as avaliações agora.
          </p>
          <Button variant="outline" onClick={() => void consulta.refetch()}>
            Tentar de novo
          </Button>
        </div>
      </PaginaAdmin>
    );
  }

  const publicadas = consulta.data.filter((a) => a.publicada);
  const media =
    publicadas.length === 0 ? null : publicadas.reduce((t, a) => t + a.nota, 0) / publicadas.length;

  return (
    <PaginaAdmin module="avaliacoes">
      <div className="grid gap-3 sm:grid-cols-2">
        <Indicador
          rotulo="Nota média"
          icone={MessageSquareText}
          valor={media === null ? "—" : media.toFixed(1).replace(".", ",")}
          nota="Só das publicadas no site"
        />
        <Indicador
          rotulo="Avaliações"
          icone={MessageSquareText}
          valor={String(consulta.data.length)}
          nota={`${publicadas.length} publicadas, ${consulta.data.length - publicadas.length} ocultas`}
        />
      </div>

      <SecaoAdmin titulo="Todas as avaliações" nota="Ocultar tira do site, sem apagar">
        {erro && (
          <p role="alert" className="text-base font-semibold text-destructive">
            {erro}
          </p>
        )}
        {consulta.data.length === 0 ? (
          <EstadoVazio
            titulo="Nenhuma avaliação ainda."
            texto="Depois de um atendimento concluído, o cliente pode avaliar em Meus horários."
          />
        ) : (
          <ul className="grid gap-3">
            {consulta.data.map((a) => (
              <li
                key={a.id}
                className="grid gap-2 rounded-md border-2 border-foreground bg-card p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Estrelas nota={a.nota} />
                  <Badge variant={a.publicada ? "success" : "neutral"}>
                    {a.publicada ? "Publicada" : "Oculta"}
                  </Badge>
                </div>
                {a.comentario ? (
                  <p className="text-base">{a.comentario}</p>
                ) : (
                  <p className="text-base text-muted-foreground">Sem comentário.</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {a.clienteNome ?? a.autor}
                  {a.servico ? `, ${a.servico}` : ""}, {dataHoraCurta(a.criadaEm, fuso)}. No site:{" "}
                  {a.autor}.
                </p>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={moderar.isPending}
                    onClick={() => moderar.mutate({ id: a.id, publicada: !a.publicada })}
                  >
                    {a.publicada ? "Ocultar do site" : "Publicar no site"}
                    <span className="sr-only">: avaliação de {a.clienteNome ?? a.autor}</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SecaoAdmin>
    </PaginaAdmin>
  );
}
