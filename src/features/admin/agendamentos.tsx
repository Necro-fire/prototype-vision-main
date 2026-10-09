import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { rotuloDaSituacao } from "@/features/agenda/agendamentos";
import { momentoNoFuso, somarDias } from "@/features/agenda/expediente";
import { useAgora, useExpediente } from "@/features/agenda/use-funcionamento";
import { dataCurta, dataLonga } from "@/lib/datas";
import { useAgendamentosDoDono } from "./agenda-do-dono";
import { BarraDeFiltros, SecaoAdmin } from "./componentes";
import { agendamentosDoDia, diaDoAgendamento, diasDaSemana, type AgendamentoDoDono } from "./hoje";
import { LinhaDoDia } from "./linha-do-dia";
import { PaginaAdmin } from "./pagina-admin";
import { todasAsSituacoes } from "./situacoes";
import { TabelaAgendamentos } from "./tabela-agendamentos";

const FUSO_PADRAO = "America/Sao_Paulo";

export function Agendamentos() {
  const consulta = useAgendamentosDoDono();
  const expediente = useExpediente();
  const agora = useAgora();
  const fuso = expediente?.fuso ?? FUSO_PADRAO;
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState("todos");
  const [dia, setDia] = useState("");
  const [visao, setVisao] = useState<"lista" | "semana">("lista");
  const [diaDaSemana, setDiaDaSemana] = useState<string | null>(null);

  if (consulta.isPending || agora === null) {
    return (
      <PaginaAdmin module="agendamentos">
        <p className="text-base text-muted-foreground">Carregando a agenda.</p>
      </PaginaAdmin>
    );
  }
  if (consulta.isError) {
    return (
      <PaginaAdmin module="agendamentos">
        <div className="grid justify-items-start gap-3 rounded-md border-2 border-dashed border-input p-5">
          <p role="alert" className="text-base font-semibold">
            Não conseguimos carregar os agendamentos agora.
          </p>
          <Button variant="outline" onClick={() => void consulta.refetch()}>
            Tentar de novo
          </Button>
        </div>
      </PaginaAdmin>
    );
  }

  const hoje = momentoNoFuso(agora, fuso).data;
  const termo = busca.trim().toLowerCase();
  const filtrados = consulta.data
    .filter(
      (a: AgendamentoDoDono) =>
        (situacao === "todos" || a.situacao === situacao) &&
        (!dia || diaDoAgendamento(a, fuso) === dia) &&
        `${a.clienteNome} ${a.servicoNome} ${a.clienteCelular}`.toLowerCase().includes(termo),
    )
    .sort((a, b) => a.inicio.localeCompare(b.inicio));

  const base = diaDaSemana ?? hoje;
  const semana = diasDaSemana(base);

  return (
    <PaginaAdmin module="agendamentos">
      <BarraDeFiltros>
        <div className="relative sm:min-w-64 sm:flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="pl-11"
            aria-label="Pesquisar registros"
            placeholder="Buscar cliente, celular ou serviço"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        {visao === "lista" && (
          <Input
            type="date"
            className="sm:w-auto"
            aria-label="Filtrar por data"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
          />
        )}
        <NativeSelect
          aria-label="Filtrar status"
          value={situacao}
          onChange={(e) => setSituacao(e.target.value)}
        >
          <option value="todos">Todos</option>
          {todasAsSituacoes.map((s) => (
            <option key={s} value={s}>
              {rotuloDaSituacao(s)}
            </option>
          ))}
        </NativeSelect>
        <Button
          variant="outline"
          onClick={() => {
            setBusca("");
            setDia("");
            setSituacao("todos");
          }}
        >
          Limpar filtros
        </Button>
        <div role="group" aria-label="Forma de ver a agenda" className="flex gap-2 sm:ml-auto">
          {(["lista", "semana"] as const).map((v) => (
            <Button
              key={v}
              variant={visao === v ? "secondary" : "outline"}
              aria-pressed={visao === v}
              onClick={() => setVisao(v)}
            >
              {v === "lista" ? "Lista" : "Semana"}
            </Button>
          ))}
        </div>
      </BarraDeFiltros>

      {visao === "lista" ? (
        <TabelaAgendamentos linhas={filtrados} agora={agora} fuso={fuso} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              aria-label="Semana anterior"
              onClick={() => setDiaDaSemana(somarDias(base, -7))}
            >
              <ChevronLeft /> Anterior
            </Button>
            <p className="text-base font-semibold" aria-live="polite">
              {dataCurta(semana[0] ?? base)} a {dataCurta(semana[6] ?? base)}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDiaDaSemana(null)}>
                Esta semana
              </Button>
              <Button
                variant="outline"
                size="sm"
                aria-label="Próxima semana"
                onClick={() => setDiaDaSemana(somarDias(base, 7))}
              >
                Próxima <ChevronRight />
              </Button>
            </div>
          </div>
          {semana.map((d) => {
            const doDia = agendamentosDoDia(filtrados, d, fuso);
            return (
              <SecaoAdmin key={d} titulo={dataLonga(d)} {...(d === hoje ? { nota: "Hoje" } : {})}>
                {doDia.length === 0 ? (
                  <p className="text-base text-muted-foreground">Nenhum horário.</p>
                ) : (
                  <ol className="grid gap-3">
                    {doDia.map((a) => (
                      <LinhaDoDia key={a.id} agendamento={a} agora={agora} fuso={fuso} />
                    ))}
                  </ol>
                )}
              </SecaoAdmin>
            );
          })}
        </>
      )}
    </PaginaAdmin>
  );
}
