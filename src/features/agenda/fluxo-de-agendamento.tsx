import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ehErroDeHorario,
  reservar,
  salvarPerfil,
  type Agendamento,
} from "@/features/agenda/agendamentos";
import { descreverQuando, type Expediente } from "@/features/agenda/expediente";
import { SeletorDeHorario } from "@/features/agenda/seletor-de-horario";
import { useAgora } from "@/features/agenda/use-funcionamento";
import type { Catalogo } from "@/features/catalogo/banco";
import type { Sessao } from "@/features/conta/sessao";
import { validarCelular, validarNome } from "@/features/conta/validacao";
import { precoCurtoDeCentavos } from "@/lib/dinheiro";
import { normalizePhone } from "@/lib/telefone";
import { cn } from "@/lib/utils";

const PASSOS = ["Serviço", "Dia e horário", "Confirmar"];
const TITULOS = ["Qual serviço?", "Que dia e horário?", "Confira e confirme"];
const botaoDoPasso = ["Escolher dia e horário", "Revisar agendamento"];

type Erros = {
  servico?: string;
  hora?: string;
  nome?: string | undefined;
  celular?: string | undefined;
  geral?: string;
};

export function FluxoDeAgendamento({
  catalogo,
  sessao,
  expediente,
  servicoInicial,
  inicioInicial,
}: {
  catalogo: Catalogo | null;
  sessao: Sessao | null;
  expediente: Expediente | null;
  servicoInicial: string | undefined;
  inicioInicial: string | undefined;
}) {
  const agora = useAgora();
  const queryClient = useQueryClient();
  const servicos = catalogo?.servicos ?? [];

  // Quem volta do login chega com o serviço e o horário já escolhidos.
  const servicoValido = servicos.some((s) => s.id === servicoInicial);
  const inicioValido = inicioInicial !== undefined && !Number.isNaN(Date.parse(inicioInicial));
  const [passo, setPasso] = useState(servicoValido ? (inicioValido ? 2 : 1) : 0);
  const [servicoId, setServicoId] = useState(servicoValido ? (servicoInicial ?? "") : "");
  const [inicio, setInicio] = useState<string | null>(
    servicoValido && inicioValido ? (inicioInicial ?? null) : null,
  );
  const [observacao, setObservacao] = useState("");
  const [nome, setNome] = useState(sessao?.nome ?? "");
  const [celular, setCelular] = useState(sessao?.celular ?? "");
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);
  const [reserva, setReserva] = useState<Agendamento | null>(null);

  // O foco acompanha o passo, para quem usa teclado ou leitor de tela.
  const titulo = useRef<HTMLHeadingElement>(null);
  const montado = useRef(false);
  useEffect(() => {
    if (montado.current) titulo.current?.focus();
    montado.current = true;
  }, [passo, reserva]);

  const servico = servicos.find((s) => s.id === servicoId);
  const perfilCompleto = Boolean(sessao?.nome.trim() && sessao.celular);
  const nomeFinal = (perfilCompleto ? sessao?.nome : nome)?.trim() ?? "";
  const celularFinal = perfilCompleto ? (sessao?.celular ?? "") : celular;

  function avancar() {
    setErros({});
    if (passo === 0 && !servico) {
      setErros({ servico: "Escolha um serviço para continuar." });
      return;
    }
    if (passo === 1 && !inicio) {
      setErros({ hora: "Escolha um horário livre para continuar." });
      return;
    }
    setPasso(passo + 1);
  }

  async function confirmar() {
    if (!servico || !inicio || !sessao) return;
    if (!perfilCompleto) {
      const novos = { nome: validarNome(nome), celular: validarCelular(celular) };
      if (novos.nome || novos.celular) {
        setErros(novos);
        return;
      }
    }
    setErros({});
    setEnviando(true);
    try {
      if (!perfilCompleto) {
        await salvarPerfil(sessao.id, { nome: nome.trim(), celular: normalizePhone(celular) });
      }
      setReserva(await reservar({ servicoId: servico.id, inicio, observacao: observacao.trim() }));
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "Não foi possível agendar.";
      setErros({ geral: mensagem });
      if (ehErroDeHorario(erro)) {
        // Alguém pode ter reservado antes: busca os horários de novo e volta a escolher.
        void queryClient.invalidateQueries({ queryKey: ["ocupados"] });
        setInicio(null);
        setPasso(1);
      }
    } finally {
      setEnviando(false);
    }
  }

  function recomecar() {
    setReserva(null);
    setPasso(0);
    setServicoId("");
    setInicio(null);
    setObservacao("");
    setErros({});
  }

  const quando = inicio && expediente ? descreverQuando(inicio, expediente.fuso) : undefined;
  const voltar =
    servico && inicio ? `/agendamento?service=${servico.id}&inicio=${inicio}` : undefined;

  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-20 pt-8">
      <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">
        Agendar horário
      </h1>

      {reserva ? (
        <Confirmacao
          reserva={reserva}
          nome={nomeFinal}
          fuso={expediente?.fuso ?? "America/Sao_Paulo"}
          tituloRef={titulo}
          onNovo={recomecar}
        />
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
              servico={servico?.nome}
              duracao={servico?.duracaoMinutos}
              quando={quando}
              precoCentavos={servico?.precoCentavos}
            />

            <section aria-labelledby="titulo-do-passo" className="grid gap-6 lg:order-first">
              <h2
                id="titulo-do-passo"
                ref={titulo}
                tabIndex={-1}
                className="font-display text-3xl font-extrabold leading-tight outline-none"
              >
                {TITULOS[passo]}
              </h2>

              {passo === 0 &&
                (catalogo === null ? (
                  <p role="alert" className="text-base font-semibold">
                    Não conseguimos carregar os serviços agora. Recarregue a página em instantes.
                  </p>
                ) : (
                  <fieldset className="grid gap-3">
                    <legend className="sr-only">Serviço</legend>
                    <ul className="grid gap-2">
                      {servicos.map((s) => (
                        <li key={s.id}>
                          <label className="block cursor-pointer">
                            <input
                              type="radio"
                              name="servico"
                              value={s.id}
                              checked={s.id === servicoId}
                              onChange={() => {
                                setServicoId(s.id);
                                setInicio(null);
                                setErros({});
                              }}
                              className="peer sr-only"
                            />
                            <span className="grid min-h-16 grid-cols-[1fr_auto] items-center gap-3 rounded-md border-2 border-input bg-card px-4 py-3 transition-colors peer-checked:border-foreground peer-checked:bg-accent peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-ring">
                              <span className="grid">
                                <strong className="font-display text-xl font-bold leading-tight">
                                  {s.nome}
                                </strong>
                                <span className="text-sm text-muted-foreground">
                                  {s.duracaoMinutos} min
                                </span>
                              </span>
                              <span className="font-display text-xl font-extrabold tabular-nums">
                                {precoCurtoDeCentavos(s.precoCentavos)}
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
                ))}

              {passo === 1 &&
                (!expediente || !servico ? (
                  <p role="alert" className="text-base font-semibold">
                    Não conseguimos carregar a agenda agora. Recarregue a página em instantes.
                  </p>
                ) : agora === null ? (
                  <p className="text-base text-muted-foreground">Carregando os horários.</p>
                ) : (
                  <SeletorDeHorario
                    expediente={expediente}
                    agora={agora}
                    duracaoMinutos={servico.duracaoMinutos}
                    valor={inicio}
                    aoEscolher={(valor) => {
                      setInicio(valor);
                      setErros({});
                    }}
                    erro={erros.hora}
                  />
                ))}

              {passo === 2 && (
                <div className="grid gap-5">
                  {!perfilCompleto && sessao && (
                    <div className="grid max-w-md gap-5">
                      <p className="text-base">
                        Falta completar o seu cadastro: a barbearia precisa do seu nome e celular.
                      </p>
                      <Campo
                        id="nome"
                        rotulo="Seu nome"
                        {...(erros.nome ? { erro: erros.nome } : {})}
                      >
                        {(props) => (
                          <Input
                            {...props}
                            autoComplete="name"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                          />
                        )}
                      </Campo>
                      <Campo
                        id="celular"
                        rotulo="Celular com DDD"
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
                    </div>
                  )}

                  <dl className="divide-y divide-border rounded-md border-2 border-foreground bg-card">
                    {[
                      ...(sessao && perfilCompleto
                        ? [
                            ["Cliente", nomeFinal],
                            ["Celular", celularFinal],
                          ]
                        : []),
                      ["Serviço", servico?.nome ?? ""],
                      ["Quando", quando ?? ""],
                      ["Valor", servico ? precoCurtoDeCentavos(servico.precoCentavos) : ""],
                    ].map(([rotulo, valor]) => (
                      <div key={rotulo} className="flex justify-between gap-4 px-4 py-3">
                        <dt className="text-muted-foreground">{rotulo}</dt>
                        <dd className="text-right font-semibold">{valor}</dd>
                      </div>
                    ))}
                  </dl>

                  {sessao ? (
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
                  ) : (
                    <div className="grid gap-3 rounded-md border-2 border-foreground bg-card p-5">
                      <h3 className="font-display text-xl font-bold">
                        Entre para confirmar o horário
                      </h3>
                      <p className="text-base">
                        Seu horário fica guardado. Depois de entrar, você volta direto para cá.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Button asChild>
                          <Link to="/entrar" search={{ voltar }}>
                            Entrar
                          </Link>
                        </Button>
                        <Button asChild variant="outline">
                          <Link to="/criar-conta" search={{ voltar }}>
                            Criar conta
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Pagamento na barbearia. Sem cobrança antecipada.
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
                {passo < 2 ? (
                  <Button size="lg" onClick={avancar}>
                    {botaoDoPasso[passo]} <ArrowRight />
                  </Button>
                ) : (
                  sessao && (
                    <Button size="lg" disabled={enviando} onClick={() => void confirmar()}>
                      {enviando ? "Confirmando" : "Confirmar agendamento"}
                    </Button>
                  )
                )}
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
  precoCentavos,
}: {
  servico: string | undefined;
  duracao: number | undefined;
  quando: string | undefined;
  precoCentavos: number | undefined;
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
          {precoCentavos !== undefined ? precoCurtoDeCentavos(precoCentavos) : "—"}
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
  nome,
  fuso,
  tituloRef,
  onNovo,
}: {
  reserva: Agendamento;
  nome: string;
  fuso: string;
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
      <p className="text-lg">{nome ? `${nome}, seu` : "Seu"} horário está reservado.</p>
      <dl className="divide-y divide-border rounded-md border-2 border-foreground bg-card">
        {[
          ["Serviço", reserva.servicoNome],
          ["Quando", descreverQuando(reserva.inicio, fuso)],
          ["Valor", `${precoCurtoDeCentavos(reserva.precoCentavos)}, pagos na barbearia`],
          ["Duração", `${reserva.duracaoMinutos} minutos`],
        ].map(([rotulo, valor]) => (
          <div key={rotulo} className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-muted-foreground">{rotulo}</dt>
            <dd className="text-right font-semibold">{valor}</dd>
          </div>
        ))}
      </dl>
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
