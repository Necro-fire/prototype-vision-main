import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, MapPin } from "lucide-react";

import { Foto } from "@/components/foto";
import { EstadoDeFuncionamento } from "@/components/marca";
import { ShopLayout } from "@/components/shop-layout";
import { Button } from "@/components/ui/button";
import { descreverFuncionamento } from "@/features/agenda/funcionamento";
import { useFuncionamento } from "@/features/agenda/use-funcionamento";
import { metasDaPagina } from "@/lib/marca";

export const Route = createFileRoute("/contato")({
  component: Contact,
  head: () => ({
    meta: metasDaPagina("Contato", "Horário de atendimento e como chegar à ON-STYLE."),
  }),
});

function Contact() {
  const { funcionamento, hours } = useFuncionamento();
  const { dias, horas } = descreverFuncionamento(hours);
  return (
    <ShopLayout>
      <div className="mx-auto grid w-full max-w-3xl gap-8 px-5 pb-20 pt-10">
        <header className="grid gap-3">
          <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">
            Contato
          </h1>
          <EstadoDeFuncionamento
            aberto={funcionamento?.aberto ?? false}
            texto={funcionamento?.texto}
          />
        </header>

        <Foto
          arquivo="cadeira-junto-a-porta"
          alt="Cadeira de barbeiro antiga ao lado de uma porta aberta, com o sol entrando pelo piso de madeira."
        />

        <dl className="grid gap-4">
          <div className="flex gap-4 rounded-md border-2 border-foreground bg-card p-5">
            <Clock aria-hidden="true" className="mt-1 size-6 shrink-0" />
            <div className="grid gap-1">
              <dt className="font-display text-xl font-bold">Horário de atendimento</dt>
              <dd className="text-lg">
                {dias ? `${capitalizar(dias)}, das ${horas}.` : "A definir."}
              </dd>
            </div>
          </div>
          <div className="flex gap-4 rounded-md border-2 border-foreground bg-card p-5">
            <MapPin aria-hidden="true" className="mt-1 size-6 shrink-0" />
            <div className="grid gap-1">
              <dt className="font-display text-xl font-bold">Endereço e telefone</dt>
              <dd className="text-lg text-muted-foreground">
                A barbearia ainda não informou o endereço nem o telefone.
              </dd>
            </div>
          </div>
        </dl>

        <div>
          <Button asChild size="lg">
            <Link to="/agendamento" search={{ service: undefined }}>
              Agendar horário
            </Link>
          </Button>
        </div>
      </div>
    </ShopLayout>
  );
}

const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);
