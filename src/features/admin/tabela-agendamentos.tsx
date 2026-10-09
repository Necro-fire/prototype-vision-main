import { Link } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { rotuloDaSituacao, valorCobradoCentavos } from "@/features/agenda/agendamentos";
import { SituacaoBadge } from "@/features/agenda/situacao";
import { dataCurta } from "@/lib/datas";
import { precoCurtoDeCentavos } from "@/lib/dinheiro";
import { AcoesDoAgendamento } from "./acoes-do-agendamento";
import { EstadoVazio } from "./componentes";
import { diaDoAgendamento, type AgendamentoDoDono } from "./hoje";
import { ListaAdaptavel } from "./lista-adaptavel";
import { horaNoFuso } from "@/features/agenda/horarios-livres";

export function TabelaAgendamentos({
  linhas,
  agora,
  fuso,
  vazio,
}: {
  linhas: AgendamentoDoDono[];
  agora: Date;
  fuso: string;
  vazio?: string;
}) {
  return (
    <ListaAdaptavel
      descricao="Agendamentos"
      linhas={linhas}
      chave={(a) => a.id}
      vazio={
        <EstadoVazio
          icone={CalendarDays}
          titulo={vazio ?? "Nenhum agendamento por aqui."}
          texto="Os agendamentos feitos pelos clientes no site aparecem aqui."
          acao={
            <Button asChild variant="outline">
              <Link to="/agendamento" search={{ service: undefined }}>
                Ver o agendamento do site
              </Link>
            </Button>
          }
        />
      }
      colunas={[
        {
          rotulo: "Cliente",
          principal: true,
          render: (a) => (
            <>
              <strong className="font-semibold">{a.clienteNome}</strong>
              <span className="block text-sm font-normal text-muted-foreground">
                {a.clienteCelular}
              </span>
            </>
          ),
        },
        { rotulo: "Serviço", render: (a) => a.servicoNome },
        {
          rotulo: "Quando",
          render: (a) => `${dataCurta(diaDoAgendamento(a, fuso))}, ${horaNoFuso(a.inicio, fuso)}`,
        },
        {
          rotulo: "Valor",
          alinharADireita: true,
          render: (a) => precoCurtoDeCentavos(valorCobradoCentavos(a)),
        },
        {
          rotulo: "Situação",
          render: (a) => <SituacaoBadge situacao={rotuloDaSituacao(a.situacao)} />,
        },
        {
          rotulo: "Ações",
          render: (a) => <AcoesDoAgendamento agendamento={a} agora={agora} fuso={fuso} />,
        },
      ]}
    />
  );
}
