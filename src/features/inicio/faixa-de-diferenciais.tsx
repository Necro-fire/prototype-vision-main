import { Link } from "@tanstack/react-router";
import { CalendarCheck, Gift, MapPin, TicketPercent, Wallet, type LucideIcon } from "lucide-react";

import { useContato } from "@/features/contato/use-contato";
import { useRegraDeFidelidade } from "@/features/fidelidade/banco";

type Item = {
  icone: LucideIcon;
  titulo: string;
  texto: string;
  para?: "/contato" | "/cliente/fidelidade";
};

// A faixa azul abaixo do painel: quatro fatos, cada um com seu ícone, separados por filete. Só
// diz o que é verdade para esta barbearia: a agenda única, o pagamento, o cartão fidelidade (ou
// o cupom) e o endereço, que vem do banco.
export function FaixaDeDiferenciais() {
  const contato = useContato();
  const regra = useRegraDeFidelidade();

  const fidelidade: Item = regra.data?.ativa
    ? {
        icone: Gift,
        titulo: "Cartão fidelidade",
        texto: `A cada ${regra.data.atendimentos} atendimentos, ${regra.data.servicoNome ?? "um serviço"} grátis`,
        para: "/cliente/fidelidade",
      }
    : { icone: TicketPercent, titulo: "Cupom de desconto", texto: "Digite o código ao agendar" };

  const itens: Item[] = [
    {
      icone: CalendarCheck,
      titulo: "Uma agenda só",
      texto: "O horário que aparece livre está mesmo livre",
    },
    { icone: Wallet, titulo: "Pagamento", texto: "Na barbearia, sem pagar antes" },
    fidelidade,
    {
      icone: MapPin,
      titulo: "Endereço",
      texto: contato?.endereco ?? "Veja na página de contato",
      para: "/contato",
    },
  ];

  return (
    <section
      aria-label="Diferenciais da barbearia"
      className="mx-auto w-full max-w-6xl px-5 py-10 sm:py-12"
    >
      <ul className="grid divide-y divide-white/25 bg-blue px-5 text-blue-foreground sm:grid-cols-2 sm:divide-y-0 sm:px-0 lg:grid-cols-4 lg:divide-x">
        {itens.map((item) => {
          const conteudo = (
            <>
              <item.icone aria-hidden="true" className="mt-0.5 size-7 shrink-0" />
              <span className="grid gap-1">
                <strong className="text-lg font-semibold leading-tight">{item.titulo}</strong>
                <span className="text-base">{item.texto}</span>
              </span>
            </>
          );
          const base = "flex h-full items-start gap-4 py-5 sm:px-6";
          return (
            <li key={item.titulo}>
              {item.para ? (
                <Link to={item.para} className={`${base} underline-offset-4 hover:underline`}>
                  {conteudo}
                </Link>
              ) : (
                <div className={base}>{conteudo}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
