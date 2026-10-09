import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { avaliar, chavesDeAvaliacoes } from "./banco";
import { SeletorDeNota } from "./estrelas";

const LIMITE = 500;

// "Como foi seu atendimento?": nota de 1 a 5 e um comentário opcional, uma vez por atendimento.
export function DialogoDeAvaliacao({
  agendamentoId,
  servico,
  aoFechar,
  aoAvaliar,
}: {
  agendamentoId: string;
  servico: string;
  aoFechar: () => void;
  aoAvaliar: () => void;
}) {
  const queryClient = useQueryClient();
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [erroDaNota, setErroDaNota] = useState<string | undefined>();

  const envio = useMutation({
    mutationFn: avaliar,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chavesDeAvaliacoes.minhas });
      aoAvaliar();
    },
  });

  function enviar() {
    if (nota === 0) {
      setErroDaNota("Escolha de 1 a 5 estrelas.");
      return;
    }
    setErroDaNota(undefined);
    envio.mutate({ agendamentoId, nota, comentario: comentario.trim() });
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Como foi seu atendimento?</DialogTitle>
          <DialogDescription>
            {servico}. Sua avaliação aparece na página de avaliações, com seu primeiro nome e a
            inicial do sobrenome.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            enviar();
          }}
        >
          <SeletorDeNota
            valor={nota}
            aoMudar={(n) => {
              setNota(n);
              setErroDaNota(undefined);
            }}
            {...(erroDaNota ? { erro: erroDaNota } : {})}
          />
          <Campo
            id="avaliacao-comentario"
            rotulo="Comentário"
            opcional
            ajuda={`${comentario.length} de ${LIMITE} caracteres.`}
          >
            {(props) => (
              <Textarea
                {...props}
                maxLength={LIMITE}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
              />
            )}
          </Campo>
          {envio.isError && (
            <p role="alert" className="text-base font-semibold text-destructive">
              {envio.error.message}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={aoFechar}>
              Agora não
            </Button>
            <Button type="submit" disabled={envio.isPending}>
              {envio.isPending ? "Enviando" : "Enviar avaliação"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
