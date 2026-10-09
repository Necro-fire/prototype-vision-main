import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, MapPin, MessageCircle, Phone } from "lucide-react";

import { Foto } from "@/components/foto";
import { EstadoDeFuncionamento } from "@/components/marca";
import { ShopLayout } from "@/components/shop-layout";
import { Button } from "@/components/ui/button";
import { descreverExpediente } from "@/features/agenda/expediente";
import { useFuncionamento } from "@/features/agenda/use-funcionamento";
import {
  linkDoInstagram,
  linkDoMapa,
  linkDoTelefone,
  linkDoWhatsapp,
} from "@/features/contato/links";
import { useContato } from "@/features/contato/use-contato";
import { metasDaPagina } from "@/lib/marca";

export const Route = createFileRoute("/contato")({
  component: Contact,
  head: () => ({
    meta: metasDaPagina("Contato", "Horário de atendimento e como chegar à ON-STYLE."),
  }),
});

const linkClasse = "font-semibold text-info underline underline-offset-4 hover:no-underline";

function Contact() {
  const contato = useContato();
  const { funcionamento, expediente } = useFuncionamento();
  const atendimento = expediente ? descreverExpediente(expediente) : [];
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
                {atendimento.length > 0
                  ? atendimento.map((g) => (
                      <span key={g.dias} className="block">
                        {capitalizar(g.dias)}, das {g.horas}.
                      </span>
                    ))
                  : "A definir."}
              </dd>
            </div>
          </div>
          <div className="flex gap-4 rounded-md border-2 border-foreground bg-card p-5">
            <MapPin aria-hidden="true" className="mt-1 size-6 shrink-0" />
            <div className="grid gap-1">
              <dt className="font-display text-xl font-bold">Endereço</dt>
              <dd className="text-lg">
                {contato?.endereco ? (
                  <>
                    {contato.endereco}{" "}
                    <a
                      href={linkDoMapa(contato.endereco) ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      className={linkClasse}
                    >
                      Ver no mapa
                    </a>
                  </>
                ) : (
                  <span className="text-muted-foreground">
                    A barbearia ainda não informou o endereço.
                  </span>
                )}
              </dd>
            </div>
          </div>
          <div className="flex gap-4 rounded-md border-2 border-foreground bg-card p-5">
            <Phone aria-hidden="true" className="mt-1 size-6 shrink-0" />
            <div className="grid gap-1">
              <dt className="font-display text-xl font-bold">Telefone e redes</dt>
              <dd className="grid gap-1 text-lg">
                {!contato?.telefone && !contato?.whatsapp && !contato?.instagram && (
                  <span className="text-muted-foreground">
                    A barbearia ainda não informou telefone nem redes.
                  </span>
                )}
                {contato?.telefone && (
                  <span>
                    Telefone:{" "}
                    <a href={linkDoTelefone(contato.telefone) ?? undefined} className={linkClasse}>
                      {contato.telefone}
                    </a>
                  </span>
                )}
                {contato?.whatsapp && (
                  <span className="flex items-center gap-1">
                    <MessageCircle aria-hidden="true" className="size-5" />
                    WhatsApp:{" "}
                    <a
                      href={linkDoWhatsapp(contato.whatsapp) ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      className={linkClasse}
                    >
                      {contato.whatsapp}
                    </a>
                  </span>
                )}
                {contato?.instagram && (
                  <span>
                    Instagram:{" "}
                    <a
                      href={linkDoInstagram(contato.instagram) ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      className={linkClasse}
                    >
                      @{contato.instagram}
                    </a>
                  </span>
                )}
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
