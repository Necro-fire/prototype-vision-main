import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarDays } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Input } from "@/components/ui/input";
import type { Booking } from "@/features/agenda/tipos";
import { SituacaoBadge, situacoesAtivas } from "@/features/agenda/situacao";
import { useShop } from "@/features/demo/shop-provider";
import { dataLonga } from "@/lib/datas";
import { precoCurto } from "@/lib/dinheiro";
import { normalizePhone } from "@/lib/telefone";

export function MeusHorarios() {
  const shop = useShop();
  const [celular, setCelular] = useState("");
  const [erro, setErro] = useState("");
  const [cancelando, setCancelando] = useState<Booking | null>(null);

  const cliente = shop.clients.find((c) => c.phone === shop.currentPhone);
  const meus = shop.bookings.filter((b) => b.phone === shop.currentPhone);
  const proximos = meus
    .filter((b) => situacoesAtivas.includes(b.status))
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const historico = meus
    .filter((b) => !situacoesAtivas.includes(b.status))
    .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));

  return (
    <>
      <div className="mx-auto grid w-full max-w-3xl gap-8 px-5 pb-20 pt-10">
        <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">
          Meus horários
        </h1>

        {!shop.currentPhone ? (
          <form
            className="grid max-w-md gap-5"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              const normalizado = normalizePhone(celular);
              if (!/^\d{10,11}$/.test(normalizado)) {
                setErro("Digite o celular com DDD, por exemplo (11) 99999-9999.");
                return;
              }
              setErro("");
              shop.setCurrentPhone(normalizado);
            }}
          >
            <Campo id="celular-cliente" rotulo="Celular com DDD" {...(erro ? { erro } : {})}>
              {(props) => (
                <Input
                  {...props}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(11) 99999-9999"
                  value={celular}
                  onChange={(e) => setCelular(e.target.value)}
                />
              )}
            </Campo>
            <div>
              <Button type="submit" size="lg">
                Ver meus horários
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Acesso de demonstração, sem verificação de identidade: qualquer pessoa que digite o
              número vê os agendamentos dele. Não use dados pessoais reais. O login com e-mail e
              senha chega com o banco de dados.
            </p>
          </form>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-lg">
                Olá, <strong>{cliente?.name ?? "bem-vindo"}</strong>.
              </p>
              <Button variant="outline" size="sm" onClick={() => shop.setCurrentPhone("")}>
                Sair
              </Button>
            </div>

            {meus.length === 0 ? (
              <div className="grid justify-items-start gap-4 rounded-md border-2 border-dashed border-input p-6">
                <CalendarDays aria-hidden="true" className="size-8" />
                <p className="text-lg">Você ainda não tem agendamentos nesta sessão.</p>
                <Button asChild>
                  <Link to="/agendamento" search={{ service: undefined }}>
                    Agendar horário
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <Secao titulo="Próximos">
                  {proximos.length === 0 ? (
                    <p className="text-base text-muted-foreground">Nenhum horário reservado.</p>
                  ) : (
                    proximos.map((b) => (
                      <Cartao key={b.id} reserva={b}>
                        {["Agendado", "Confirmado"].includes(b.status) && (
                          <Button variant="outline" size="sm" onClick={() => setCancelando(b)}>
                            Cancelar agendamento
                          </Button>
                        )}
                      </Cartao>
                    ))
                  )}
                </Secao>
                {historico.length > 0 && (
                  <Secao titulo="Histórico">
                    {historico.map((b) => (
                      <Cartao key={b.id} reserva={b}>
                        <Button asChild variant="outline" size="sm">
                          <Link to="/agendamento" search={{ service: b.serviceId }}>
                            Agendar de novo
                          </Link>
                        </Button>
                      </Cartao>
                    ))}
                  </Secao>
                )}
              </>
            )}
          </>
        )}
      </div>

      <AlertDialog open={!!cancelando} onOpenChange={(aberto) => !aberto && setCancelando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar este agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelando
                ? `${cancelando.serviceName}, ${dataLonga(cancelando.date)}, às ${cancelando.time}. O horário volta a ficar livre para outras pessoas.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter agendamento</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cancelando)
                  shop.setBookings((old) =>
                    old.map((item) =>
                      item.id === cancelando.id ? { ...item, status: "Cancelado" } : item,
                    ),
                  );
                setCancelando(null);
              }}
            >
              Cancelar agendamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section aria-label={titulo} className="grid gap-3">
      <h2 className="font-display text-2xl font-extrabold">{titulo}</h2>
      <ul className="grid gap-3">{children}</ul>
    </section>
  );
}

function Cartao({ reserva, children }: { reserva: Booking; children: React.ReactNode }) {
  return (
    <li className="grid gap-3 rounded-md border-2 border-foreground bg-card p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="font-display text-xl font-bold leading-tight">{reserva.serviceName}</h3>
          <SituacaoBadge situacao={reserva.status} />
        </div>
        <p className="text-base">
          {dataLonga(reserva.date)}, às {reserva.time}
        </p>
        <p className="text-sm text-muted-foreground">
          {precoCurto(reserva.price)}, pagos na barbearia
        </p>
      </div>
      <div>{children}</div>
    </li>
  );
}
