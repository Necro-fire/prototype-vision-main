import { EstadoCarregando } from "@/components/ui/carregando";
import { useQuery } from "@tanstack/react-query";
import { Package, Scissors, Ticket, TrendingUp } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useExpediente } from "@/features/agenda/use-funcionamento";
import {
  faturamentoBruto,
  faturamentoPorDia,
  faturamentoPorForma,
  type FiltroFinanceiro,
} from "@/features/financeiro/faturamento";
import { rotuloDaForma } from "@/features/financeiro/formas-de-pagamento";
import { dataCurta } from "@/lib/datas";
import { dinheiroDeCentavos } from "@/lib/dinheiro";
import { useAgendamentosDoDono } from "./agenda-do-dono";
import { chavesDoCatalogo, lerProdutosDoDono, lerServicosDoDono } from "./catalogo-do-dono";
import { BarraDeFiltros, EstadoVazio, Indicador, SecaoAdmin } from "./componentes";
import { ListaAdaptavel } from "./lista-adaptavel";
import { PaginaAdmin } from "./pagina-admin";
import { chavesDeVendas, lerVendas } from "./vendas-do-dono";

const FUSO_PADRAO = "America/Sao_Paulo";

export function Financeiro() {
  const fuso = useExpediente()?.fuso ?? FUSO_PADRAO;
  const agendamentos = useAgendamentosDoDono();
  const vendas = useQuery({ queryKey: chavesDeVendas.vendas, queryFn: lerVendas });
  const servicos = useQuery({ queryKey: chavesDoCatalogo.servicos, queryFn: lerServicosDoDono });
  const produtos = useQuery({ queryKey: chavesDoCatalogo.produtos, queryFn: lerProdutosDoDono });
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [servicoId, setServicoId] = useState("");
  const [produtoId, setProdutoId] = useState("");

  const consultas = [agendamentos, vendas, servicos, produtos];
  if (agendamentos.isError || vendas.isError || servicos.isError || produtos.isError) {
    return (
      <PaginaAdmin module="financeiro">
        <div className="grid justify-items-start gap-3 rounded-xl border border-dashed border-line bg-card/40 p-5">
          <p role="alert" className="text-base font-semibold">
            Não conseguimos carregar o financeiro agora.
          </p>
          <Button variant="outline" onClick={() => consultas.forEach((c) => void c.refetch())}>
            Tentar de novo
          </Button>
        </div>
      </PaginaAdmin>
    );
  }
  if (agendamentos.isPending || vendas.isPending || servicos.isPending || produtos.isPending) {
    return (
      <PaginaAdmin module="financeiro">
        <EstadoCarregando texto="Carregando." />
      </PaginaAdmin>
    );
  }

  const filtro: FiltroFinanceiro = {
    ...(de ? { de } : {}),
    ...(ate ? { ate } : {}),
    ...(servicoId ? { servicoId } : {}),
    ...(produtoId ? { produtoId } : {}),
  };
  const r = faturamentoBruto(agendamentos.data, vendas.data, fuso, filtro);
  const porDia = faturamentoPorDia(agendamentos.data, vendas.data, fuso, filtro);
  const porForma = faturamentoPorForma(agendamentos.data, vendas.data, fuso, filtro);

  return (
    <PaginaAdmin module="financeiro">
      <BarraDeFiltros>
        <Input
          type="date"
          className="sm:w-auto"
          aria-label="Data inicial"
          value={de}
          onChange={(e) => setDe(e.target.value)}
        />
        <Input
          type="date"
          className="sm:w-auto"
          aria-label="Data final"
          value={ate}
          onChange={(e) => setAte(e.target.value)}
        />
        <NativeSelect
          aria-label="Filtrar serviço"
          value={servicoId}
          onChange={(e) => {
            setServicoId(e.target.value);
            setProdutoId("");
          }}
        >
          <option value="">Todos os serviços</option>
          {servicos.data.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Filtrar produto"
          value={produtoId}
          onChange={(e) => {
            setProdutoId(e.target.value);
            setServicoId("");
          }}
        >
          <option value="">Todos os produtos</option>
          {produtos.data.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </NativeSelect>
        <Button
          variant="outline"
          onClick={() => {
            setDe("");
            setAte("");
            setServicoId("");
            setProdutoId("");
          }}
        >
          Limpar filtros
        </Button>
      </BarraDeFiltros>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador
          rotulo="Faturamento bruto"
          icone={TrendingUp}
          valor={dinheiroDeCentavos(r.totalCentavos)}
          nota="Serviços concluídos mais vendas"
        />
        <Indicador
          rotulo="Serviços"
          icone={Scissors}
          valor={dinheiroDeCentavos(r.servicosCentavos)}
          nota={`${r.atendimentos} atendimentos concluídos`}
        />
        <Indicador
          rotulo="Produtos"
          icone={Package}
          valor={dinheiroDeCentavos(r.produtosCentavos)}
          nota={`${r.vendas} vendas, sem as estornadas`}
        />
        <Indicador
          rotulo="Descontos concedidos"
          icone={Ticket}
          valor={dinheiroDeCentavos(r.descontosCentavos)}
          nota="Cupons e serviços grátis, já fora do total"
        />
      </div>

      <SecaoAdmin titulo="Por forma de pagamento">
        <ListaAdaptavel
          descricao="Faturamento por forma de pagamento"
          linhas={porForma}
          chave={(l) => l.forma ?? "sem-forma"}
          vazio={
            <EstadoVazio
              titulo="Nada no período."
              texto="Atendimentos concluídos e vendas aparecem aqui, separados por como foram pagos."
            />
          }
          colunas={[
            { rotulo: "Forma", principal: true, render: (l) => rotuloDaForma(l.forma) },
            { rotulo: "Pagamentos", alinharADireita: true, render: (l) => String(l.quantidade) },
            {
              rotulo: "Total",
              alinharADireita: true,
              render: (l) => <strong>{dinheiroDeCentavos(l.totalCentavos)}</strong>,
            },
          ]}
        />
      </SecaoAdmin>

      <SecaoAdmin titulo="Por dia">
        <ListaAdaptavel
          descricao="Faturamento por dia"
          linhas={porDia}
          chave={(d) => d.dia}
          vazio={
            <EstadoVazio
              titulo="Nada no período."
              texto="Atendimentos concluídos e vendas aparecem aqui, dia a dia."
            />
          }
          colunas={[
            { rotulo: "Dia", principal: true, render: (d) => dataCurta(d.dia) },
            {
              rotulo: "Serviços",
              alinharADireita: true,
              render: (d) => dinheiroDeCentavos(d.servicosCentavos),
            },
            {
              rotulo: "Produtos",
              alinharADireita: true,
              render: (d) => dinheiroDeCentavos(d.produtosCentavos),
            },
            {
              rotulo: "Total",
              alinharADireita: true,
              render: (d) => <strong>{dinheiroDeCentavos(d.totalCentavos)}</strong>,
            },
          ]}
        />
      </SecaoAdmin>
    </PaginaAdmin>
  );
}
