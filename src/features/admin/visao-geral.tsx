import { Link } from "@tanstack/react-router";
import { CalendarDays, CheckCheck, Clock, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { momentoNoFuso } from "@/features/agenda/expediente";
import { horaNoFuso } from "@/features/agenda/horarios-livres";
import { useAgora, useExpediente } from "@/features/agenda/use-funcionamento";
import { dataLonga } from "@/lib/datas";
import { precoCurtoDeCentavos } from "@/lib/dinheiro";
import { useAgendamentosDoDono } from "./agenda-do-dono";
import { EstadoVazio, Indicador, SecaoAdmin } from "./componentes";
import {
  agendamentosDoDia,
  diaDoAgendamento,
  proximoCliente,
  resumoDoDia,
  semRegistro,
} from "./hoje";
import { LinhaDoDia } from "./linha-do-dia";
import { PaginaAdmin } from "./pagina-admin";
import { TabelaAgendamentos } from "./tabela-agendamentos";

const FUSO_PADRAO = "America/Sao_Paulo";

// A tela "Hoje": o que a barbearia precisa saber agora, com o avanço de cada horário em um toque.
export function VisaoGeral() {
  const consulta = useAgendamentosDoDono();
  const expediente = useExpediente();
  const agora = useAgora();
  const fuso = expediente?.fuso ?? FUSO_PADRAO;

  if (consulta.isPending || agora === null) {
    return (
      <PaginaAdmin module="dashboard">
        <p className="text-base text-muted-foreground">Carregando a agenda.</p>
      </PaginaAdmin>
    );
  }
  if (consulta.isError) {
    return (
      <PaginaAdmin module="dashboard">
        <div className="grid justify-items-start gap-3 rounded-md border-2 border-dashed border-input p-5">
          <p role="alert" className="text-base font-semibold">
            Não conseguimos carregar a agenda agora.
          </p>
          <Button variant="outline" onClick={() => void consulta.refetch()}>
            Tentar de novo
          </Button>
        </div>
      </PaginaAdmin>
    );
  }

  const hoje = momentoNoFuso(agora, fuso).data;
  const doDia = agendamentosDoDia(consulta.data, hoje, fuso);
  const resumo = resumoDoDia(doDia);
  const proximo = proximoCliente(doDia, agora);
  const esquecidos = semRegistro(doDia, agora);
  const depois = consulta.data
    .filter(
      (a) =>
        diaDoAgendamento(a, fuso) > hoje &&
        (a.situacao === "agendado" || a.situacao === "confirmado"),
    )
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
    .slice(0, 5);

  return (
    <PaginaAdmin module="dashboard">
      <p className="-mt-3 text-base font-semibold">{dataLonga(hoje)}</p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          rotulo="Próximo cliente"
          icone={Clock}
          valor={proximo ? horaNoFuso(proximo.inicio, fuso) : "—"}
          nota={
            proximo
              ? `${proximo.clienteNome}, ${proximo.servicoNome}`
              : "Nenhum horário pela frente hoje"
          }
        />
        <Indicador
          rotulo="Marcados hoje"
          icone={CalendarDays}
          valor={String(resumo.marcados)}
          nota={`${resumo.cancelados} cancelados, ${resumo.faltas} faltas`}
        />
        <Indicador
          rotulo="Já atendidos"
          icone={CheckCheck}
          valor={`${resumo.concluidos} de ${resumo.marcados}`}
          nota="Atendimentos concluídos hoje"
        />
        <Indicador
          rotulo="Previsto para hoje"
          icone={Wallet}
          valor={precoCurtoDeCentavos(resumo.previstoCentavos)}
          nota={`${precoCurtoDeCentavos(resumo.recebidoCentavos)} já concluídos`}
        />
      </div>

      {esquecidos.length > 0 && (
        <p
          role="status"
          className="rounded-md bg-warning-soft px-4 py-3 text-base font-semibold text-warning"
        >
          {esquecidos.length === 1
            ? "1 horário de hoje já passou e ficou sem situação."
            : `${esquecidos.length} horários de hoje já passaram e ficaram sem situação.`}{" "}
          Marque como concluído ou como falta.
        </p>
      )}

      <SecaoAdmin titulo="Linha do tempo de hoje">
        {doDia.length === 0 ? (
          <EstadoVazio
            icone={CalendarDays}
            titulo="Nenhum horário marcado para hoje."
            texto="Quando um cliente agendar, o horário aparece aqui na hora."
          />
        ) : (
          <ol className="grid gap-3">
            {doDia.map((a) => (
              <LinhaDoDia key={a.id} agendamento={a} agora={agora} fuso={fuso} />
            ))}
          </ol>
        )}
      </SecaoAdmin>

      <SecaoAdmin titulo="Próximos dias" nota="Os cinco próximos horários reservados">
        <TabelaAgendamentos
          linhas={depois}
          agora={agora}
          fuso={fuso}
          vazio="Nada reservado para os próximos dias."
        />
        <Link
          to="/admin/$module"
          params={{ module: "agendamentos" }}
          className="inline-flex min-h-11 items-center font-semibold text-info underline underline-offset-4 hover:no-underline"
        >
          Ver todos os agendamentos
        </Link>
      </SecaoAdmin>
    </PaginaAdmin>
  );
}
