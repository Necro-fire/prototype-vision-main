import { createFileRoute, Link } from "@tanstack/react-router";

import { EstadoDeFuncionamento } from "@/components/marca";
import { ServiceList } from "@/components/service-list";
import { ShopLayout } from "@/components/shop-layout";
import { Button } from "@/components/ui/button";
import { descreverExpediente } from "@/features/agenda/expediente";
import { ProximoHorarioCard } from "@/features/agenda/proximo-horario-card";
import { useFuncionamento } from "@/features/agenda/use-funcionamento";
import { lerCatalogo } from "@/features/catalogo/banco";
import { metasDaPagina } from "@/lib/marca";
import { ouNulo } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  component: Index,
  loader: async () => ({ catalogo: await ouNulo(lerCatalogo()) }),
  head: () => ({
    meta: metasDaPagina(
      "Barbearia",
      "Corte, barba e sobrancelha com hora marcada. Veja os preços e agende em um minuto.",
    ),
  }),
});

const passos = [
  { titulo: "Escolha o serviço", texto: "Veja o preço e quanto tempo leva." },
  { titulo: "Escolha o dia e o horário", texto: "Só aparecem os horários livres." },
  { titulo: "Pague na barbearia", texto: "Sem cobrança antecipada." },
];

function Index() {
  const { catalogo } = Route.useLoaderData();
  const { funcionamento, expediente } = useFuncionamento();
  const atendimento = expediente
    ? descreverExpediente(expediente).map((g) => `${g.dias}, das ${g.horas}`)
    : [];
  return (
    <ShopLayout>
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 pb-16 pt-8 lg:grid-cols-[5fr_6fr] lg:items-start lg:gap-14 lg:pt-12">
        <div className="grid gap-6">
          <EstadoDeFuncionamento
            aberto={funcionamento?.aberto ?? false}
            texto={funcionamento?.texto}
          />
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl">
            Escolha o serviço, veja o preço e marque em um minuto.
          </h1>
          <ProximoHorarioCard servico={catalogo?.servicos[0]} />
        </div>
        <ServiceList catalogo={catalogo} />
      </div>

      <section aria-labelledby="como-funciona" className="border-y border-border bg-muted py-14">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5">
          <h2 id="como-funciona" className="font-display text-3xl font-extrabold">
            Como funciona
          </h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {passos.map((passo, i) => (
              <li key={passo.titulo} className="flex items-start gap-4">
                <span
                  aria-hidden="true"
                  className="grid size-11 shrink-0 place-items-center rounded-md bg-foreground font-display text-xl font-extrabold text-background"
                >
                  {i + 1}
                </span>
                <div className="grid gap-0.5 pt-0.5">
                  <h3 className="font-display text-xl font-bold leading-tight">{passo.titulo}</h3>
                  <p className="text-base text-muted-foreground">{passo.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        aria-labelledby="atendimento"
        className="mx-auto grid w-full max-w-6xl gap-4 px-5 py-14 sm:grid-cols-[1fr_auto] sm:items-center"
      >
        <div className="grid gap-1">
          <h2 id="atendimento" className="font-display text-3xl font-extrabold">
            Horário de atendimento
          </h2>
          <p className="text-lg">
            {atendimento.length > 0
              ? `Atendemos de ${atendimento.join("; ")}.`
              : "Horário de atendimento a definir."}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/contato">Como chegar</Link>
        </Button>
      </section>
    </ShopLayout>
  );
}
