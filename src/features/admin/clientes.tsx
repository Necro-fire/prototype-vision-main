import { useQuery } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { rotuloDaSituacao, valorCobradoCentavos } from "@/features/agenda/agendamentos";
import { horaNoFuso } from "@/features/agenda/horarios-livres";
import { SituacaoBadge } from "@/features/agenda/situacao";
import { useExpediente } from "@/features/agenda/use-funcionamento";
import { dataCurta } from "@/lib/datas";
import { precoCurtoDeCentavos } from "@/lib/dinheiro";
import {
  chavesDoDono,
  lerClientes,
  useAgendamentosDoDono,
  type ClienteDoDono,
} from "./agenda-do-dono";
import { BarraDeFiltros, EstadoVazio } from "./componentes";
import { diaDoAgendamento, type AgendamentoDoDono } from "./hoje";
import { ListaAdaptavel } from "./lista-adaptavel";
import { PaginaAdmin } from "./pagina-admin";

const FUSO_PADRAO = "America/Sao_Paulo";

export function Clientes() {
  const clientes = useQuery({ queryKey: chavesDoDono.clientes, queryFn: lerClientes });
  const agendamentos = useAgendamentosDoDono();
  const fuso = useExpediente()?.fuso ?? FUSO_PADRAO;
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<ClienteDoDono | null>(null);

  if (clientes.isPending || agendamentos.isPending) {
    return (
      <PaginaAdmin module="clientes">
        <p className="text-base text-muted-foreground">Carregando os clientes.</p>
      </PaginaAdmin>
    );
  }
  if (clientes.isError || agendamentos.isError) {
    return (
      <PaginaAdmin module="clientes">
        <div className="grid justify-items-start gap-3 rounded-md border-2 border-dashed border-input p-5">
          <p role="alert" className="text-base font-semibold">
            Não conseguimos carregar os clientes agora.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              void clientes.refetch();
              void agendamentos.refetch();
            }}
          >
            Tentar de novo
          </Button>
        </div>
      </PaginaAdmin>
    );
  }

  const doCliente = (id: string) => agendamentos.data.filter((a) => a.clienteId === id);
  const termo = busca.trim().toLowerCase();
  const filtrados = clientes.data.filter((c) =>
    `${c.nome} ${c.celular}`.toLowerCase().includes(termo),
  );

  return (
    <PaginaAdmin module="clientes">
      <BarraDeFiltros>
        <div className="relative sm:min-w-64 sm:max-w-md sm:flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="pl-11"
            aria-label="Buscar cliente"
            placeholder="Buscar por nome ou celular"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <p className="text-base text-muted-foreground sm:ml-auto">
          {clientes.data.length} clientes com conta
        </p>
      </BarraDeFiltros>
      <ListaAdaptavel
        descricao="Clientes"
        linhas={filtrados}
        chave={(c) => c.id}
        vazio={
          <EstadoVazio
            icone={Users}
            titulo={clientes.data.length === 0 ? "Nenhum cliente cadastrado." : "Nenhum resultado."}
            texto={
              clientes.data.length === 0
                ? "Quem criar uma conta no site aparece aqui."
                : "Tente buscar por outro nome ou número."
            }
          />
        }
        colunas={[
          { rotulo: "Nome", principal: true, render: (c) => c.nome || "Sem nome" },
          { rotulo: "Celular", render: (c) => c.celular || "Não informado" },
          {
            rotulo: "Agendamentos",
            alinharADireita: true,
            render: (c) => doCliente(c.id).length,
          },
          {
            rotulo: "Histórico",
            alinharADireita: true,
            render: (c) => (
              <Button variant="ghost" size="sm" onClick={() => setAberto(c)}>
                Ver histórico
                <span className="sr-only">: {c.nome}</span>
              </Button>
            ),
          },
        ]}
      />

      {aberto && (
        <HistoricoDoCliente
          cliente={aberto}
          agendamentos={doCliente(aberto.id)}
          fuso={fuso}
          aoFechar={() => setAberto(null)}
        />
      )}
    </PaginaAdmin>
  );
}

function HistoricoDoCliente({
  cliente,
  agendamentos,
  fuso,
  aoFechar,
}: {
  cliente: ClienteDoDono;
  agendamentos: AgendamentoDoDono[];
  fuso: string;
  aoFechar: () => void;
}) {
  const ordenados = [...agendamentos].sort((a, b) => b.inicio.localeCompare(a.inicio));
  return (
    <Dialog open onOpenChange={(aberto) => !aberto && aoFechar()}>
      <DialogContent className="max-h-dvh overflow-y-auto">
        <DialogTitle>{cliente.nome || "Cliente sem nome"}</DialogTitle>
        <DialogDescription>
          {cliente.celular || "Sem celular"}. Cliente desde {dataCurta(cliente.desde.slice(0, 10))}.
        </DialogDescription>
        {ordenados.length === 0 ? (
          <p className="text-base text-muted-foreground">Ainda não agendou.</p>
        ) : (
          <ul className="grid gap-2">
            {ordenados.map((a) => (
              <li key={a.id} className="grid gap-1 rounded-md border-2 border-border p-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <strong className="font-semibold">{a.servicoNome}</strong>
                  <SituacaoBadge situacao={rotuloDaSituacao(a.situacao)} />
                </div>
                <p className="text-base">
                  {dataCurta(diaDoAgendamento(a, fuso))}, {horaNoFuso(a.inicio, fuso)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {precoCurtoDeCentavos(valorCobradoCentavos(a))}
                </p>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
