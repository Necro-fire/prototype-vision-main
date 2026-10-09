import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { availableTimes, isoDate } from "@/features/agenda/disponibilidade";
import type { Booking } from "@/features/agenda/tipos";
import { useAgora } from "@/features/agenda/use-funcionamento";
import { useShop } from "@/features/demo/shop-provider";
import { cn } from "@/lib/utils";
import { dataLonga, diaDaSemanaCurto, diaDoMes } from "@/lib/datas";
import { precoCurto } from "@/lib/dinheiro";
import { normalizePhone } from "@/lib/telefone";

const PASSOS = ["Serviço", "Dia e horário", "Seus dados", "Confirmar"];
const DIAS_A_FRENTE = 14;

const botaoDoPasso = [
  "Escolher dia e horário",
  "Informar meus dados",
  "Revisar agendamento",
  "Confirmar agendamento",
];

type Erros = { servico?: string; hora?: string; celular?: string; nome?: string; geral?: string };

export function FluxoDeAgendamento({ servicoInicial }: { servicoInicial: string | undefined }) {
  const shop = useShop();
  const agora = useAgora();
  const [passo, setPasso] = useState(servicoInicial ? 1 : 0);
  const [serviceId, setServiceId] = useState(servicoInicial ?? "");
  const [data, setData] = useState<string | null>(null);
  const [hora, setHora] = useState("");
  const [nome, setNome] = useState("");
  const [celular, setCelular] = useState("");
  const [observacao, setObservacao] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [reserva, setReserva] = useState<Booking | null>(null);

  // O foco acompanha o passo, para quem usa teclado ou leitor de tela.
  const titulo = useRef<HTMLHeadingElement>(null);
  const montado = useRef(false);
  useEffect(() => {
    if (montado.current) titulo.current?.focus();
    montado.current = true;
  }, [passo, reserva]);

  const servico = shop.services.find((s) => s.id === serviceId && s.active);
  const dias =
    agora && servico
      ? Array.from({ length: DIAS_A_FRENTE }, (_, i) => {
          const iso = isoDate(new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + i));
          const horarios = availableTimes(
            iso,
            servico.duration,
            shop.bookings,
            shop.hours.open,
            shop.hours.close,
            shop.hours.days,
          );
          return { iso, horarios };
        })
      : [];
  const dataAtual = data ?? dias.find((d) => d.horarios.length > 0)?.iso ?? null;
  const horarios = dias.find((d) => d.iso === dataAtual)?.horarios ?? [];
  const cliente = shop.clients.find((c) => c.phone === normalizePhone(celular));
  const nomeFinal = (cliente?.name || nome).trim();

  function avancar() {
    setErros({});
    if (passo === 0 && !servico) {
      setErros({ servico: "Escolha um serviço para continuar." });
      return;
    }
    if (passo === 1 && (!dataAtual || !horarios.includes(hora))) {
      setErros({ hora: "Escolha um horário livre para continuar." });
      return;
    }
    if (passo === 2) {
      const novos: Erros = {};
      if (!/^\d{10,11}$/.test(normalizePhone(celular)))
        novos.celular = "Digite o celular com DDD, por exemplo (11) 99999-9999.";
      if (!nomeFinal) novos.nome = "Digite seu nome.";
      if (novos.celular || novos.nome) {
        setErros(novos);
        return;
      }
    }
    setPasso(passo + 1);
  }

  function confirmar() {
    if (!dataAtual) return;
    try {
      setReserva(
        shop.book({
          serviceId,
          date: dataAtual,
          time: hora,
          name: nomeFinal,
          phone: celular,
          note: observacao,
        }),
      );
      setErros({});
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : "Não foi possível agendar. Tente de novo.";
      setErros({ geral: mensagem });
      if (mensagem.includes("horário")) {
        setHora("");
        setPasso(1);
      }
    }
  }

  function recomecar() {
    setReserva(null);
    setPasso(0);
    setServiceId("");
    setData(null);
    setHora("");
    setObservacao("");
    setErros({});
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-20 pt-8">
      <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">
        Agendar horário
      </h1>

      {reserva ? (
        <Confirmacao reserva={reserva} tituloRef={titulo} onNovo={recomecar} />
      ) : (
        <>
          <ol aria-label="Passos do agendamento" className="mt-6 flex items-center gap-3 sm:gap-6">
            {PASSOS.map((nomeDoPasso, i) => (
              <li
                key={nomeDoPasso}
                aria-current={i === passo ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 text-base font-semibold",
                  i > passo && "text-muted-foreground",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-md border-2 text-base font-extrabold",
                    i < passo && "border-foreground bg-foreground text-background",
                    i === passo && "border-primary bg-primary text-primary-foreground",
                    i > passo && "border-input",
                  )}
                >
                  {i < passo ? <Check className="size-5" /> : i + 1}
                </span>
                <span className={i === passo ? "" : "hidden sm:inline"}>{nomeDoPasso}</span>
                {i < PASSOS.length - 1 && (
                  <span aria-hidden="true" className="hidden h-0.5 w-6 bg-border sm:block" />
                )}
              </li>
            ))}
          </ol>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
            <Resumo
              servico={servico?.name}
              duracao={servico?.duration}
              quando={dataAtual && hora ? `${dataLonga(dataAtual)}, ${hora}` : undefined}
              preco={servico?.price}
            />

            <section aria-labelledby="titulo-do-passo" className="grid gap-6 lg:order-first">
              <h2
                id="titulo-do-passo"
                ref={titulo}
                tabIndex={-1}
                className="font-display text-3xl font-extrabold leading-tight outline-none"
              >
                {["Qual serviço?", "Que dia e horário?", "Seus dados", "Confira e confirme"][passo]}
              </h2>

              {passo === 0 && (
                <fieldset className="grid gap-3">
                  <legend className="sr-only">Serviço</legend>
                  <ul className="grid gap-2">
                    {shop.services
                      .filter((s) => s.active)
                      .map((s) => (
                        <li key={s.id}>
                          <label className="block cursor-pointer">
                            <input
                              type="radio"
                              name="servico"
                              value={s.id}
                              checked={s.id === serviceId}
                              onChange={() => {
                                setServiceId(s.id);
                                setData(null);
                                setHora("");
                                setErros({});
                              }}
                              className="peer sr-only"
                            />
                            <span className="grid min-h-16 grid-cols-[1fr_auto] items-center gap-3 rounded-md border-2 border-input bg-card px-4 py-3 transition-colors peer-checked:border-foreground peer-checked:bg-accent peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-ring">
                              <span className="grid">
                                <strong className="font-display text-xl font-bold leading-tight">
                                  {s.name}
                                </strong>
                                <span className="text-sm text-muted-foreground">
                                  {s.duration} min
                                </span>
                              </span>
                              <span className="font-display text-xl font-extrabold tabular-nums">
                                {precoCurto(s.price)}
                              </span>
                            </span>
                          </label>
                        </li>
                      ))}
                  </ul>
                  {erros.servico && (
                    <p role="alert" className="text-sm font-semibold text-destructive">
                      {erros.servico}
                    </p>
                  )}
                </fieldset>
              )}

              {passo === 1 && (
                <div className="grid gap-6">
                  {agora === null ? (
                    <p className="text-base text-muted-foreground">Carregando os horários.</p>
                  ) : dias.every((d) => d.horarios.length === 0) ? (
                    <p className="rounded-md border-2 border-dashed border-input p-5 text-base">
                      Não há horários livres nos próximos {DIAS_A_FRENTE} dias.{" "}
                      <Link to="/contato" className="font-semibold text-info underline">
                        Veja como falar com a barbearia
                      </Link>
                      .
                    </p>
                  ) : (
                    <>
                      <div className="grid gap-2">
                        <p id="rotulo-dia" className="text-base font-semibold">
                          Dia
                        </p>
                        <div
                          role="group"
                          aria-labelledby="rotulo-dia"
                          className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2"
                        >
                          {dias.map((d) => {
                            const semVaga = d.horarios.length === 0;
                            return (
                              <button
                                key={d.iso}
                                type="button"
                                disabled={semVaga}
                                aria-pressed={d.iso === dataAtual}
                                aria-label={`${dataLonga(d.iso)}${semVaga ? ", sem horários livres" : ""}`}
                                onClick={() => {
                                  setData(d.iso);
                                  setHora("");
                                  setErros({});
                                }}
                                className={cn(
                                  "grid min-h-20 min-w-16 shrink-0 cursor-pointer place-items-center content-center rounded-md border-2 px-2 transition-colors",
                                  d.iso === dataAtual
                                    ? "border-foreground bg-foreground text-background"
                                    : "border-input bg-card hover:bg-muted",
                                  semVaga &&
                                    "cursor-not-allowed border-dashed border-border bg-transparent text-muted-foreground line-through hover:bg-transparent",
                                )}
                              >
                                <span className="text-sm font-semibold">
                                  {diaDaSemanaCurto(d.iso)}
                                </span>
                                <span className="font-display text-2xl font-extrabold leading-none">
                                  {diaDoMes(d.iso)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <p id="rotulo-hora" className="text-base font-semibold">
                          Horário{dataAtual ? `, ${dataLonga(dataAtual)}` : ""}
                        </p>
                        <div
                          role="group"
                          aria-labelledby="rotulo-hora"
                          className="grid grid-cols-3 gap-2 sm:grid-cols-4"
                        >
                          {horarios.map((h) => (
                            <button
                              key={h}
                              type="button"
                              aria-pressed={h === hora}
                              onClick={() => {
                                setHora(h);
                                setErros({});
                              }}
                              className={cn(
                                "min-h-12 cursor-pointer rounded-md border-2 text-lg font-bold tabular-nums transition-colors",
                                h === hora
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-input bg-card hover:bg-muted",
                              )}
                            >
                              {h}
                            </button>
                          ))}
                        </div>
                        {erros.hora && (
                          <p role="alert" className="text-sm font-semibold text-destructive">
                            {erros.hora}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {passo === 2 && (
                <div className="grid max-w-md gap-5">
                  <Campo
                    id="celular"
                    rotulo="Celular com DDD"
                    ajuda="É por ele que reconhecemos os seus agendamentos."
                    {...(erros.celular ? { erro: erros.celular } : {})}
                  >
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
                  {cliente && (
                    <p role="status" className="text-base font-semibold text-success">
                      Que bom ver você de novo, {cliente.name}. Vamos usar o seu cadastro.
                    </p>
                  )}
                  <Campo id="nome" rotulo="Seu nome" {...(erros.nome ? { erro: erros.nome } : {})}>
                    {(props) => (
                      <Input
                        {...props}
                        autoComplete="name"
                        placeholder="Nome e sobrenome"
                        value={cliente?.name || nome}
                        disabled={!!cliente}
                        onChange={(e) => setNome(e.target.value)}
                      />
                    )}
                  </Campo>
                  <Campo id="observacao" rotulo="Observação" opcional>
                    {(props) => (
                      <Textarea
                        {...props}
                        placeholder="Algo que a gente precisa saber?"
                        value={observacao}
                        onChange={(e) => setObservacao(e.target.value)}
                      />
                    )}
                  </Campo>
                </div>
              )}

              {passo === 3 && (
                <div className="grid gap-4">
                  <dl className="divide-y divide-border rounded-md border-2 border-foreground bg-card">
                    {[
                      ["Cliente", nomeFinal],
                      ["Celular", celular],
                      ["Serviço", servico?.name ?? ""],
                      ["Quando", dataAtual ? `${dataLonga(dataAtual)}, às ${hora}` : ""],
                    ].map(([rotulo, valor]) => (
                      <div key={rotulo} className="flex justify-between gap-4 px-4 py-3">
                        <dt className="text-muted-foreground">{rotulo}</dt>
                        <dd className="text-right font-semibold">{valor}</dd>
                      </div>
                    ))}
                  </dl>
                  {observacao && <p className="text-base text-muted-foreground">{observacao}</p>}
                  <p className="text-sm text-muted-foreground">
                    Este agendamento é uma demonstração: vale só nesta sessão, não gera cobrança e
                    nenhuma mensagem é enviada.
                  </p>
                </div>
              )}

              {erros.geral && (
                <p role="alert" className="text-base font-semibold text-destructive">
                  {erros.geral}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
                {passo > 0 ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setErros({});
                      setPasso(passo - 1);
                    }}
                  >
                    <ArrowLeft /> Voltar
                  </Button>
                ) : (
                  <span />
                )}
                <Button size="lg" onClick={passo === 3 ? confirmar : avancar}>
                  {botaoDoPasso[passo]} {passo < 3 && <ArrowRight />}
                </Button>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function Resumo({
  servico,
  duracao,
  quando,
  preco,
}: {
  servico: string | undefined;
  duracao: number | undefined;
  quando: string | undefined;
  preco: number | undefined;
}) {
  return (
    <aside
      aria-label="Resumo do agendamento"
      className="grid gap-2 rounded-md border-2 border-foreground bg-card p-5 lg:sticky lg:top-6 lg:order-last"
    >
      <p className="text-sm text-muted-foreground">Seu agendamento</p>
      <p className="font-display text-2xl font-extrabold leading-tight">
        {servico ?? "Escolha um serviço"}
      </p>
      {duracao !== undefined && <p className="text-base">{duracao} minutos</p>}
      {quando && <p className="text-base font-semibold">{quando}</p>}
      <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3">
        <span className="text-base">Total</span>
        <span className="font-display text-2xl font-extrabold tabular-nums">
          {preco !== undefined ? precoCurto(preco) : "—"}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Pagamento na barbearia. Sem cobrança antecipada.
      </p>
    </aside>
  );
}

function Confirmacao({
  reserva,
  tituloRef,
  onNovo,
}: {
  reserva: Booking;
  tituloRef: React.RefObject<HTMLHeadingElement | null>;
  onNovo: () => void;
}) {
  return (
    <section aria-labelledby="agendamento-confirmado" className="mx-auto mt-10 grid max-w-xl gap-5">
      <CheckCircle2 aria-hidden="true" className="size-12 text-success" />
      <h2
        id="agendamento-confirmado"
        ref={tituloRef}
        tabIndex={-1}
        className="font-display text-4xl font-extrabold leading-tight outline-none"
      >
        Agendamento confirmado
      </h2>
      <p className="text-lg">{reserva.name}, seu horário está reservado.</p>
      <dl className="divide-y divide-border rounded-md border-2 border-foreground bg-card">
        {[
          ["Serviço", reserva.serviceName],
          ["Quando", `${dataLonga(reserva.date)}, às ${reserva.time}`],
          ["Valor", `${precoCurto(reserva.price)}, pagos na barbearia`],
          ["Duração", `${reserva.duration} minutos`],
        ].map(([rotulo, valor]) => (
          <div key={rotulo} className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-muted-foreground">{rotulo}</dt>
            <dd className="text-right font-semibold">{valor}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted-foreground">
        Este agendamento é uma demonstração: vale só nesta sessão e nenhuma mensagem foi enviada.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link to="/cliente">Ver meus agendamentos</Link>
        </Button>
        <Button variant="outline" size="lg" onClick={onNovo}>
          Agendar outro horário
        </Button>
      </div>
    </section>
  );
}
