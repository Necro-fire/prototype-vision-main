import { Link, useNavigate } from "@tanstack/react-router";
import { CalendarDays, Check, ClipboardList, Clock, Scissors, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EstadoCarregando } from "@/components/ui/carregando";
import { IconTile } from "@/components/ui/icon-tile";
import { SectionTitle } from "@/components/ui/section-title";
import { descreverExpediente, momentoNoFuso } from "@/features/agenda/expediente";
import { horaNoFuso } from "@/features/agenda/horarios-livres";
import { Passos } from "@/features/agenda/passos";
import { SeletorDeHorario } from "@/features/agenda/seletor-de-horario";
import { useAgora, useExpediente } from "@/features/agenda/use-funcionamento";
import type { Catalogo } from "@/features/catalogo/banco";
import { dataLonga } from "@/lib/datas";
import { precoCurtoDeCentavos } from "@/lib/dinheiro";
import { cn } from "@/lib/utils";

const LIMITE_DE_SERVICOS = 6;

type Erros = { servico?: string; hora?: string };

// O agendamento na página inicial: serviço, dia e horário e o resumo, lado a lado. Aqui a pessoa
// só escolhe; a reserva acontece em /agendamento, que recebe o serviço e o horário e abre já na
// confirmação (onde ficam o login e o cupom). Os horários saem da mesma regra do fluxo.
export function PainelDeAgendamento({ catalogo }: { catalogo: Catalogo | null }) {
  const expediente = useExpediente();
  const agora = useAgora();
  const navigate = useNavigate();
  const servicos = catalogo?.servicos ?? [];
  const visiveis = servicos.slice(0, LIMITE_DE_SERVICOS);

  const [servicoId, setServicoId] = useState(visiveis[0]?.id ?? "");
  const [inicio, setInicio] = useState<string | null>(null);
  const [erros, setErros] = useState<Erros>({});

  const servico = servicos.find((s) => s.id === servicoId);
  const atendimento = expediente ? descreverExpediente(expediente) : [];
  const fuso = expediente?.fuso ?? "America/Sao_Paulo";
  const dia = inicio ? dataLonga(momentoNoFuso(new Date(inicio), fuso).data) : null;
  const hora = inicio ? horaNoFuso(inicio, fuso) : null;
  const passo = !servico ? 0 : !inicio ? 1 : 2;

  function revisar() {
    if (!servico) {
      setErros({ servico: "Escolha um serviço para continuar." });
      return;
    }
    if (!inicio) {
      setErros({ hora: "Escolha um horário livre para continuar." });
      return;
    }
    void navigate({ to: "/agendamento", search: { service: servico.id, inicio } });
  }

  return (
    <section
      id="agendar"
      aria-labelledby="titulo-agendar"
      className="relative z-10 mx-auto -mt-20 w-full max-w-6xl scroll-mt-20 px-5 lg:-mt-28"
    >
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5 px-5 pt-6 sm:px-6 sm:pt-8">
          <SectionTitle id="titulo-agendar">Agende seu horário</SectionTitle>
          {atendimento.length > 0 && (
            <div className="flex items-center gap-3">
              <IconTile icone={Clock} tamanho="sm" />
              <div className="grid">
                <p className="text-sm text-muted-foreground">Atendimento</p>
                <ul className="grid text-base font-semibold">
                  {atendimento.map((g) => (
                    <li key={g.dias}>
                      <span className="first-letter:uppercase">{g.dias}</span>, das {g.horas}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <Passos atual={passo} className="px-5 pt-6 sm:px-6" />

        <div className="mt-6 grid border-t border-line md:grid-cols-2 xl:grid-cols-[1fr_1.3fr_0.95fr]">
          <Coluna
            icone={Scissors}
            titulo="Escolha o serviço"
            className="border-b border-line md:border-b-0 md:border-r"
          >
            {catalogo === null ? (
              <p role="alert" className="text-base font-semibold">
                Não conseguimos carregar os serviços agora. Recarregue a página em instantes.
              </p>
            ) : visiveis.length === 0 ? (
              <p className="text-base text-muted-foreground">
                Nenhum serviço disponível no momento.
              </p>
            ) : (
              <fieldset className="grid gap-3">
                <legend className="sr-only">Serviço</legend>
                <ul className="grid gap-2">
                  {visiveis.map((s) => {
                    const escolhido = s.id === servicoId;
                    return (
                      <li key={s.id}>
                        <label className="block cursor-pointer">
                          <input
                            type="radio"
                            name="servico-do-painel"
                            value={s.id}
                            checked={escolhido}
                            onChange={() => {
                              setServicoId(s.id);
                              setInicio(null);
                              setErros({});
                            }}
                            className="peer sr-only"
                          />
                          <span className="grid min-h-16 grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-line bg-background px-4 py-3 transition-colors hover:border-input peer-checked:border-primary peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
                            <span className="grid gap-1">
                              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <strong className="text-base font-semibold leading-tight">
                                  {s.nome}
                                </strong>
                                {s.destaque && <Badge variant="info">Mais pedido</Badge>}
                              </span>
                              <span className="flex gap-3 text-base">
                                <span className="font-bold tabular-nums text-primary">
                                  {precoCurtoDeCentavos(s.precoCentavos)}
                                </span>
                                <span className="text-muted-foreground">
                                  {s.duracaoMinutos} min
                                </span>
                              </span>
                            </span>
                            <span
                              aria-hidden="true"
                              className={cn(
                                "grid size-6 place-items-center rounded-sm border",
                                escolhido
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-input text-transparent",
                              )}
                            >
                              <Check className="size-4" />
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                {erros.servico && (
                  <p role="alert" className="text-sm font-semibold text-destructive">
                    {erros.servico}
                  </p>
                )}
              </fieldset>
            )}
            {servicos.length > LIMITE_DE_SERVICOS && (
              <Link
                to="/servicos"
                className="inline-flex min-h-11 items-center justify-self-start text-base font-semibold text-info underline underline-offset-4 hover:no-underline"
              >
                Ver todos os serviços
              </Link>
            )}
          </Coluna>

          <Coluna
            icone={CalendarDays}
            titulo="Escolha o dia e o horário"
            className="border-b border-line xl:border-b-0 xl:border-r"
          >
            {!expediente ? (
              <p role="alert" className="text-base font-semibold">
                Não conseguimos carregar a agenda agora. Recarregue a página em instantes.
              </p>
            ) : !servico ? (
              <p className="text-base text-muted-foreground">
                Escolha um serviço para ver os horários livres.
              </p>
            ) : agora === null ? (
              <EstadoCarregando texto="Carregando os horários." />
            ) : (
              <SeletorDeHorario
                key={servico.id}
                expediente={expediente}
                agora={agora}
                duracaoMinutos={servico.duracaoMinutos}
                valor={inicio}
                aoEscolher={(valor) => {
                  setInicio(valor);
                  setErros({});
                }}
              />
            )}
          </Coluna>

          <Coluna
            icone={ClipboardList}
            titulo="Resumo do agendamento"
            className="md:col-span-2 xl:col-span-1"
          >
            <dl className="grid divide-y divide-border border-y border-border">
              <Linha rotulo="Serviço" valor={servico?.nome} vazio="Escolha um serviço">
                {servico && (
                  <span className="tabular-nums text-muted-foreground">
                    {precoCurtoDeCentavos(servico.precoCentavos)}
                  </span>
                )}
              </Linha>
              <Linha rotulo="Dia" valor={dia} vazio="Escolha um dia" />
              <Linha rotulo="Horário" valor={hora} vazio="Escolha um horário" />
              <Linha
                rotulo="Duração"
                valor={servico ? `${servico.duracaoMinutos} min` : null}
                vazio="Depende do serviço"
              />
            </dl>
            <p className="flex items-baseline justify-between gap-4">
              <span className="text-base">Total</span>
              <span className="text-2xl font-semibold tabular-nums text-primary">
                {servico ? precoCurtoDeCentavos(servico.precoCentavos) : "—"}
              </span>
            </p>
            <Button size="lg" className="w-full" onClick={revisar}>
              Revisar agendamento
            </Button>
            {erros.hora && (
              <p role="alert" className="text-sm font-semibold text-destructive">
                {erros.hora}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Você confirma na próxima tela. Pagamento na barbearia, sem cobrança antecipada.
            </p>
          </Coluna>
        </div>
      </Card>
    </section>
  );
}

function Coluna({
  icone: Icone,
  titulo,
  className,
  children,
}: {
  icone: LucideIcon;
  titulo: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("grid content-start gap-5 p-5 sm:p-6", className)}>
      <h3 className="flex items-center gap-3 text-xl font-semibold leading-tight">
        <Icone aria-hidden="true" className="size-6 shrink-0 text-primary" />
        {titulo}
      </h3>
      {children}
    </div>
  );
}

function Linha({
  rotulo,
  valor,
  vazio,
  children,
}: {
  rotulo: string;
  valor: string | null | undefined;
  vazio: string;
  children?: ReactNode;
}) {
  return (
    <div className="grid gap-0.5 py-3">
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd className="flex items-baseline justify-between gap-4 text-base">
        <span
          className={cn(
            "first-letter:uppercase",
            valor ? "font-semibold" : "text-muted-foreground",
          )}
        >
          {valor ?? vazio}
        </span>
        {children}
      </dd>
    </div>
  );
}
