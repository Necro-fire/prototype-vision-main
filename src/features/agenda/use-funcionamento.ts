import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { lerProximoHorario } from "@/features/agenda/banco";
import { abertoAgora, momentoNoFuso } from "@/features/agenda/expediente";

const raiz = getRouteApi("__root__");

// O funcionamento vem do banco pela rota raiz. É nulo se a leitura falhou: as telas avisam.
export function useExpediente() {
  return raiz.useLoaderData().expediente;
}

// "Agora" só existe no navegador: o servidor mostra "conferindo" e o cliente completa,
// assim os dois renderizam o mesmo HTML na primeira passada.
export function useAgora() {
  const [agora, setAgora] = useState<Date | null>(null);
  useEffect(() => {
    setAgora(new Date());
    const timer = setInterval(() => setAgora(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return agora;
}

export function useFuncionamento() {
  const expediente = useExpediente();
  const agora = useAgora();
  return {
    agora,
    expediente,
    funcionamento: agora && expediente ? abertoAgora(expediente, agora) : null,
  };
}

// Próximo dia com horário livre para um serviço de determinada duração. Só roda no navegador:
// depende da hora de agora e dos agendamentos de quem está usando o site.
export function useProximoHorario(duracaoMinutos: number | undefined) {
  const expediente = useExpediente();
  const agora = useAgora();
  const hoje = agora && expediente ? momentoNoFuso(agora, expediente.fuso).data : null;
  const consulta = useQuery({
    queryKey: ["proximo-horario", hoje, duracaoMinutos],
    enabled: expediente !== null && hoje !== null && duracaoMinutos !== undefined,
    queryFn: () => {
      if (!expediente || duracaoMinutos === undefined) return null;
      return lerProximoHorario(expediente, duracaoMinutos, new Date());
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  return {
    agora,
    expediente,
    proximo: consulta.data ?? null,
    carregando: agora === null || (consulta.isPending && consulta.fetchStatus !== "idle"),
    falhou: consulta.isError,
  };
}
