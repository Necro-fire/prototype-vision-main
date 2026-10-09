import { useEffect, useState } from "react";
import { abertoAgora } from "@/features/agenda/funcionamento";
import { proximosHorarios } from "@/features/agenda/proximo-horario";
import { useShop } from "@/features/demo/shop-provider";

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
  const { hours } = useShop();
  const agora = useAgora();
  return { agora, hours, funcionamento: agora ? abertoAgora(hours, agora) : null };
}

// Próximo dia com horário livre para um serviço de determinada duração.
export function useProximoHorario(duration: number | undefined) {
  const { bookings, hours } = useShop();
  const agora = useAgora();
  const proximo =
    agora && duration !== undefined ? proximosHorarios(duration, bookings, hours, agora) : null;
  return { agora, proximo };
}
