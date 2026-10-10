import { useQuery } from "@tanstack/react-query";
import { Star, Users } from "lucide-react";

import { lerAvaliacoesPublicas } from "@/features/avaliacoes/banco";
import { chavesDoDono, lerClientes } from "./agenda-do-dono";
import { Indicador } from "./componentes";

const mediaEmTexto = (media: number) => media.toFixed(1).replace(".", ",");

// Os dois números que não mudam de hora em hora: quantos clientes têm conta e como a
// barbearia é avaliada. Entram na mesma grade dos números do dia. Cada cartão carrega sozinho:
// se um falha, o resto da tela segue.
export function IndicadoresDaBarbearia() {
  const clientes = useQuery({ queryKey: chavesDoDono.clientes, queryFn: lerClientes });
  const avaliacoes = useQuery({
    queryKey: ["avaliacoes", "publicas"],
    queryFn: lerAvaliacoesPublicas,
  });

  const total = clientes.data?.length;
  const resumo = avaliacoes.data?.resumo;

  return (
    <>
      <Indicador
        rotulo="Clientes"
        icone={Users}
        valor={total === undefined ? "—" : String(total)}
        nota={
          clientes.isError
            ? "Não conseguimos carregar agora"
            : total === undefined
              ? "Carregando"
              : "Pessoas com conta no site"
        }
      />
      <Indicador
        rotulo="Avaliação média"
        icone={Star}
        valor={resumo?.media != null ? `${mediaEmTexto(resumo.media)} de 5` : "—"}
        nota={
          avaliacoes.isError
            ? "Não conseguimos carregar agora"
            : !resumo
              ? "Carregando"
              : resumo.total === 0
                ? "Ainda não há avaliações"
                : resumo.total === 1
                  ? "1 avaliação publicada"
                  : `${resumo.total} avaliações publicadas`
        }
      />
    </>
  );
}
