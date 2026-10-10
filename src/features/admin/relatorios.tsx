import { EstadoCarregando } from "@/components/ui/carregando";
import { useQuery } from "@tanstack/react-query";
import { Download, Package, Scissors, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { momentoNoFuso } from "@/features/agenda/expediente";
import { useAgora, useExpediente } from "@/features/agenda/use-funcionamento";
import {
  DIAS_ATE_AGRUPAR,
  agruparPorSemana,
  compararPeriodos,
  descreverVariacao,
  paraCsv,
  periodoPredefinido,
  quantosDias,
  rankingDeProdutos,
  rankingDeServicos,
  rotulosDosPredefinidos,
  serieDiaria,
  validarPeriodo,
  type LinhaDoRanking,
  type Periodo,
  type Predefinido,
} from "@/features/financeiro/relatorios";
import { baixarArquivo } from "@/lib/baixar";
import { dataCurta } from "@/lib/datas";
import { dinheiroDeCentavos } from "@/lib/dinheiro";
import { useAgendamentosDoDono } from "./agenda-do-dono";
import { BarraDeFiltros, EstadoVazio, Indicador, SecaoAdmin } from "./componentes";
import { GraficoComparativo, type PontoDoGrafico } from "./grafico-comparativo";
import { ListaAdaptavel } from "./lista-adaptavel";
import { PaginaAdmin } from "./pagina-admin";
import { chavesDeVendas, lerVendas } from "./vendas-do-dono";

const FUSO_PADRAO = "America/Sao_Paulo";
const predefinidos = Object.keys(rotulosDosPredefinidos) as Predefinido[];

const intervalo = (p: Periodo) => `${dataCurta(p.de)} a ${dataCurta(p.ate)}`;

export function Relatorios() {
  const fuso = useExpediente()?.fuso ?? FUSO_PADRAO;
  const agora = useAgora();
  const agendamentos = useAgendamentosDoDono();
  const vendas = useQuery({ queryKey: chavesDeVendas.vendas, queryFn: lerVendas });
  const [escolhido, setEscolhido] = useState<Periodo | null>(null);

  const hoje = agora ? momentoNoFuso(agora, fuso).data : null;
  const periodo = escolhido ?? (hoje ? periodoPredefinido("ultimos30", hoje) : null);

  if (agendamentos.isError || vendas.isError) {
    return (
      <PaginaAdmin module="relatorios">
        <div className="grid justify-items-start gap-3 rounded-xl border border-dashed border-line bg-card/40 p-5">
          <p role="alert" className="text-base font-semibold">
            Não conseguimos carregar os relatórios agora.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              void agendamentos.refetch();
              void vendas.refetch();
            }}
          >
            Tentar de novo
          </Button>
        </div>
      </PaginaAdmin>
    );
  }
  if (agendamentos.isPending || vendas.isPending || !periodo || !hoje) {
    return (
      <PaginaAdmin module="relatorios">
        <EstadoCarregando texto="Carregando." />
      </PaginaAdmin>
    );
  }

  const erroDoPeriodo = validarPeriodo(periodo);
  const filtros = (
    <BarraDeFiltros>
      <div className="flex flex-wrap gap-2">
        {predefinidos.map((nome) => (
          <Button
            key={nome}
            variant="outline"
            size="sm"
            onClick={() => setEscolhido(periodoPredefinido(nome, hoje))}
          >
            {rotulosDosPredefinidos[nome]}
          </Button>
        ))}
      </div>
      <Input
        type="date"
        className="sm:w-auto"
        aria-label="Data inicial"
        value={periodo.de}
        onChange={(e) => setEscolhido({ ...periodo, de: e.target.value })}
      />
      <Input
        type="date"
        className="sm:w-auto"
        aria-label="Data final"
        value={periodo.ate}
        onChange={(e) => setEscolhido({ ...periodo, ate: e.target.value })}
      />
    </BarraDeFiltros>
  );

  if (erroDoPeriodo) {
    return (
      <PaginaAdmin module="relatorios">
        {filtros}
        <p role="alert" className="text-base font-semibold text-destructive">
          {erroDoPeriodo}
        </p>
      </PaginaAdmin>
    );
  }

  const cmp = compararPeriodos(agendamentos.data, vendas.data, fuso, periodo);
  const serieAtual = serieDiaria(agendamentos.data, vendas.data, fuso, periodo);
  const serieAnterior = serieDiaria(agendamentos.data, vendas.data, fuso, cmp.periodoAnterior);
  const agrupar = quantosDias(periodo) > DIAS_ATE_AGRUPAR;
  const atual = agrupar ? agruparPorSemana(serieAtual) : serieAtual;
  const anterior = agrupar ? agruparPorSemana(serieAnterior) : serieAnterior;
  const pontos: PontoDoGrafico[] = atual.map((p, i) => ({
    dia: p.dia,
    atualCentavos: p.totalCentavos,
    anteriorCentavos: anterior[i]?.totalCentavos ?? 0,
  }));
  const servicos = rankingDeServicos(agendamentos.data, fuso, periodo);
  const produtos = rankingDeProdutos(vendas.data, fuso, periodo);
  const subiu = (cmp.variacaoTotal ?? 0) >= 0;

  function baixarPorDia() {
    baixarArquivo(
      `faturamento-por-dia-${periodo!.de}-a-${periodo!.ate}.csv`,
      paraCsv(
        ["Dia", "Serviços (R$)", "Produtos (R$)", "Total (R$)"],
        serieAtual.map((p) => [
          p.dia,
          { centavos: p.servicosCentavos },
          { centavos: p.produtosCentavos },
          { centavos: p.totalCentavos },
        ]),
      ),
    );
  }

  function baixarRankings() {
    baixarArquivo(
      `servicos-e-produtos-${periodo!.de}-a-${periodo!.ate}.csv`,
      paraCsv(
        ["Tipo", "Nome", "Quantidade", "Total (R$)"],
        [
          ...servicos.map((l): (string | number | { centavos: number })[] => [
            "Serviço",
            l.nome,
            l.quantidade,
            { centavos: l.totalCentavos },
          ]),
          ...produtos.map((l): (string | number | { centavos: number })[] => [
            "Produto",
            l.nome,
            l.quantidade,
            { centavos: l.totalCentavos },
          ]),
        ],
      ),
    );
  }

  const colunasDoRanking = (rotuloNome: string) => [
    { rotulo: rotuloNome, principal: true, render: (l: LinhaDoRanking) => l.nome },
    {
      rotulo: "Quantidade",
      alinharADireita: true,
      render: (l: LinhaDoRanking) => String(l.quantidade),
    },
    {
      rotulo: "Total",
      alinharADireita: true,
      render: (l: LinhaDoRanking) => <strong>{dinheiroDeCentavos(l.totalCentavos)}</strong>,
    },
  ];

  return (
    <PaginaAdmin module="relatorios">
      {filtros}
      <p className="text-base text-muted-foreground">
        Período: {intervalo(periodo)}. Comparado com {intervalo(cmp.periodoAnterior)}.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador
          rotulo="Faturamento"
          icone={subiu ? TrendingUp : TrendingDown}
          valor={dinheiroDeCentavos(cmp.atual.totalCentavos)}
          nota={descreverVariacao(
            cmp.variacaoTotal,
            cmp.atual.totalCentavos,
            cmp.anterior.totalCentavos,
          )}
        />
        <Indicador
          rotulo="Serviços"
          icone={Scissors}
          valor={dinheiroDeCentavos(cmp.atual.servicosCentavos)}
          nota={descreverVariacao(
            cmp.variacaoServicos,
            cmp.atual.servicosCentavos,
            cmp.anterior.servicosCentavos,
          )}
        />
        <Indicador
          rotulo="Produtos"
          icone={Package}
          valor={dinheiroDeCentavos(cmp.atual.produtosCentavos)}
          nota={descreverVariacao(
            cmp.variacaoProdutos,
            cmp.atual.produtosCentavos,
            cmp.anterior.produtosCentavos,
          )}
        />
      </div>

      <SecaoAdmin titulo="Faturamento por dia" nota="Serviços concluídos mais vendas">
        <GraficoComparativo
          pontos={pontos}
          agrupadoPorSemana={agrupar}
          resumo={`Faturamento de ${intervalo(periodo)}: ${dinheiroDeCentavos(cmp.atual.totalCentavos)}. Período anterior: ${dinheiroDeCentavos(cmp.anterior.totalCentavos)}. Os valores de cada ${agrupar ? "semana" : "dia"} estão na tabela abaixo.`}
        />
        <details className="rounded-xl border border-line bg-card px-4 py-2">
          <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold">
            Ver os valores de cada {agrupar ? "semana" : "dia"}
          </summary>
          <div className="pt-2">
            <ListaAdaptavel
              descricao="Faturamento do período, comparado com o anterior"
              linhas={pontos}
              chave={(p) => p.dia}
              vazio={null}
              colunas={[
                {
                  rotulo: agrupar ? "Semana de" : "Dia",
                  principal: true,
                  render: (p) => dataCurta(p.dia),
                },
                {
                  rotulo: "Período escolhido",
                  alinharADireita: true,
                  render: (p) => dinheiroDeCentavos(p.atualCentavos),
                },
                {
                  rotulo: "Período anterior",
                  alinharADireita: true,
                  render: (p) => dinheiroDeCentavos(p.anteriorCentavos),
                },
              ]}
            />
          </div>
        </details>
      </SecaoAdmin>

      <SecaoAdmin titulo="Serviços mais pedidos" nota="Pelo valor cobrado">
        <ListaAdaptavel
          descricao="Serviços do período"
          linhas={servicos}
          chave={(l) => l.nome}
          vazio={
            <EstadoVazio
              titulo="Nenhum serviço concluído no período."
              texto="Escolha outro período ou conclua atendimentos na tela Hoje."
            />
          }
          colunas={colunasDoRanking("Serviço")}
        />
      </SecaoAdmin>

      <SecaoAdmin titulo="Produtos mais vendidos" nota="Sem as vendas estornadas">
        <ListaAdaptavel
          descricao="Produtos do período"
          linhas={produtos}
          chave={(l) => l.nome}
          vazio={<EstadoVazio titulo="Nenhuma venda de produto no período." />}
          colunas={colunasDoRanking("Produto")}
        />
      </SecaoAdmin>

      <SecaoAdmin titulo="Exportar" nota="Planilha para abrir no Excel ou no Google Planilhas">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={baixarPorDia}>
            <Download /> Baixar faturamento por dia
          </Button>
          <Button variant="outline" onClick={baixarRankings}>
            <Download /> Baixar serviços e produtos
          </Button>
        </div>
      </SecaoAdmin>
    </PaginaAdmin>
  );
}
