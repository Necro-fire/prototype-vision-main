import { EstadoCarregando } from "@/components/ui/carregando";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { momentoNoFuso } from "@/features/agenda/expediente";
import { instanteNoFuso } from "@/features/agenda/horarios-livres";
import { valorCobradoCentavos } from "@/features/agenda/agendamentos";
import { useAgora, useExpediente } from "@/features/agenda/use-funcionamento";
import {
  CampoDeCupom,
  cupomVigente,
  type CupomAplicado,
} from "@/features/descontos/campo-de-cupom";
import { rotuloDaForma, type FormaPagamento } from "@/features/financeiro/formas-de-pagamento";
import { SeletorDeForma } from "@/features/financeiro/seletor-de-forma";
import { dataCurta } from "@/lib/datas";
import { dinheiroDeCentavos } from "@/lib/dinheiro";
import { useAgendamentosDoDono } from "./agenda-do-dono";
import { chavesDoCaixa } from "./caixa-do-dono";
import { chavesDoCatalogo, lerProdutosDoDono } from "./catalogo-do-dono";
import { BarraDeFiltros, EstadoVazio, SecaoAdmin } from "./componentes";
import { diaDoAgendamento } from "./hoje";
import { ListaAdaptavel } from "./lista-adaptavel";
import { PaginaAdmin } from "./pagina-admin";
import {
  chavesDeVendas,
  estornarVenda,
  lerVendas,
  registrarVenda,
  type VendaDoDono,
} from "./vendas-do-dono";

const FUSO_PADRAO = "America/Sao_Paulo";

export function Vendas() {
  const queryClient = useQueryClient();
  const fuso = useExpediente()?.fuso ?? FUSO_PADRAO;
  const agora = useAgora();
  const vendas = useQuery({ queryKey: chavesDeVendas.vendas, queryFn: lerVendas });
  const produtos = useQuery({ queryKey: chavesDoCatalogo.produtos, queryFn: lerProdutosDoDono });
  const agendamentos = useAgendamentosDoDono();

  const [produtoId, setProdutoId] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [data, setData] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [forma, setForma] = useState<FormaPagamento | null>(null);
  const [erroDaForma, setErroDaForma] = useState<string | undefined>();
  const [motivo, setMotivo] = useState("");
  const [cupomAplicado, setCupomAplicado] = useState<CupomAplicado | null>(null);
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);
  const [estornando, setEstornando] = useState<VendaDoDono | null>(null);

  const registrar = useMutation({
    mutationFn: registrarVenda,
    onSuccess: () => {
      setQuantidade("1");
      setForma(null);
      setCupomAplicado(null);
      setMensagem({ texto: "Venda registrada.", erro: false });
      void queryClient.invalidateQueries({ queryKey: chavesDeVendas.vendas });
      void queryClient.invalidateQueries({ queryKey: chavesDoCaixa.todos });
    },
    onError: (e) => setMensagem({ texto: e.message, erro: true }),
  });

  const estorno = useMutation({
    mutationFn: estornarVenda,
    onSuccess: () => setMensagem({ texto: "Venda estornada.", erro: false }),
    onError: (e) => setMensagem({ texto: e.message, erro: true }),
    onSettled: () => {
      setEstornando(null);
      setMotivo("");
      void queryClient.invalidateQueries({ queryKey: chavesDeVendas.vendas });
      void queryClient.invalidateQueries({ queryKey: chavesDoCaixa.todos });
    },
  });

  if (vendas.isPending || produtos.isPending || agendamentos.isPending || agora === null) {
    return (
      <PaginaAdmin module="vendas">
        <EstadoCarregando texto="Carregando." />
      </PaginaAdmin>
    );
  }
  if (vendas.isError || produtos.isError || agendamentos.isError) {
    return (
      <PaginaAdmin module="vendas">
        <div className="grid justify-items-start gap-3 rounded-xl border border-dashed border-line bg-card/40 p-5">
          <p role="alert" className="text-base font-semibold">
            Não conseguimos carregar as vendas agora.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              void vendas.refetch();
              void produtos.refetch();
              void agendamentos.refetch();
            }}
          >
            Tentar de novo
          </Button>
        </div>
      </PaginaAdmin>
    );
  }

  const hoje = momentoNoFuso(agora, fuso).data;
  const ativos = produtos.data.filter((p) => p.ativo);
  const produtoAtual = ativos.find((p) => p.id === produtoId) ?? ativos[0];
  const dia = data || hoje;
  // O cupom abate do total da venda; se o produto ou a quantidade mudar, é preciso aplicar de novo.
  const qtdDigitada = Number(quantidade);
  const bruto =
    produtoAtual && Number.isInteger(qtdDigitada) && qtdDigitada >= 1
      ? produtoAtual.precoCentavos * qtdDigitada
      : 0;
  const cupom = cupomVigente(cupomAplicado, bruto);

  function enviar() {
    const qtd = Number(quantidade);
    if (!produtoAtual) return;
    if (!Number.isInteger(qtd) || qtd < 1) {
      setMensagem({ texto: "A quantidade precisa ser de pelo menos 1.", erro: true });
      return;
    }
    if (!forma) {
      setErroDaForma("Escolha como o cliente pagou.");
      return;
    }
    setMensagem(null);
    // Venda de hoje leva a hora de agora; de outro dia, meio-dia no horário da barbearia.
    const ocorridaEm =
      dia === hoje
        ? new Date().toISOString()
        : new Date(instanteNoFuso(dia, 720, fuso)).toISOString();
    registrar.mutate({
      itens: [{ produtoId: produtoAtual.id, quantidade: qtd }],
      formaPagamento: forma,
      ocorridaEm,
      ...(cupom ? { cupom: cupom.codigo } : {}),
    });
  }

  const doPeriodo = vendas.data.filter(
    (v) => !periodo || momentoNoFuso(new Date(v.ocorridaEm), fuso).data === periodo,
  );
  const servicos = agendamentos.data
    .filter(
      (a) => a.situacao === "concluido" && (!periodo || diaDoAgendamento(a, fuso) === periodo),
    )
    .sort((a, b) => b.inicio.localeCompare(a.inicio));

  return (
    <PaginaAdmin module="vendas">
      <SecaoAdmin titulo="Registrar venda de produto">
        {ativos.length === 0 ? (
          <EstadoVazio
            titulo="Nenhum produto ativo."
            texto="Cadastre ou ative um produto para registrar vendas."
          />
        ) : (
          <form
            noValidate
            className="grid gap-4 rounded-xl border border-line bg-card p-4 sm:grid-cols-3 sm:p-5"
            onSubmit={(e) => {
              e.preventDefault();
              enviar();
            }}
          >
            <Campo id="venda-produto" rotulo="Produto">
              {(props) => (
                <NativeSelect
                  {...props}
                  value={produtoAtual?.id ?? ""}
                  onChange={(e) => setProdutoId(e.target.value)}
                >
                  {ativos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}, {dinheiroDeCentavos(p.precoCentavos)}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </Campo>
            <Campo id="venda-quantidade" rotulo="Quantidade">
              {(props) => (
                <Input
                  {...props}
                  inputMode="numeric"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                />
              )}
            </Campo>
            <Campo id="venda-data" rotulo="Data">
              {(props) => (
                <Input
                  {...props}
                  type="date"
                  value={dia}
                  onChange={(e) => setData(e.target.value)}
                />
              )}
            </Campo>
            <div className="grid gap-2 sm:col-span-3">
              <CampoDeCupom
                id="venda-cupom"
                totalCentavos={bruto}
                aplicado={cupom}
                aoAplicar={setCupomAplicado}
                aoRemover={() => setCupomAplicado(null)}
              />
              <p className="text-base">
                Total da venda:{" "}
                <strong className="tabular-nums">
                  {dinheiroDeCentavos(bruto - (cupom?.descontoCentavos ?? 0))}
                </strong>
              </p>
            </div>
            <div className="sm:col-span-3">
              <SeletorDeForma
                valor={forma}
                aoMudar={(escolhida) => {
                  setForma(escolhida);
                  setErroDaForma(undefined);
                }}
                {...(erroDaForma ? { erro: erroDaForma } : {})}
              />
            </div>
            <div className="grid gap-3 sm:col-span-3">
              {mensagem && (
                <p
                  role={mensagem.erro ? "alert" : "status"}
                  className={`text-base font-semibold ${mensagem.erro ? "text-destructive" : "text-success"}`}
                >
                  {mensagem.texto}
                </p>
              )}
              <div>
                <Button type="submit" disabled={registrar.isPending}>
                  <Plus /> {registrar.isPending ? "Registrando" : "Registrar venda"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </SecaoAdmin>

      <BarraDeFiltros>
        <Input
          type="date"
          className="sm:w-auto"
          aria-label="Filtrar vendas por data"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
        />
        <Button variant="outline" onClick={() => setPeriodo("")}>
          Limpar filtro
        </Button>
      </BarraDeFiltros>

      <SecaoAdmin titulo="Histórico de vendas">
        <ListaAdaptavel
          descricao="Vendas de produtos"
          linhas={doPeriodo}
          chave={(v) => v.id}
          vazio={<EstadoVazio titulo="Nenhuma venda registrada." />}
          colunas={[
            {
              rotulo: "Produto",
              principal: true,
              render: (v) => v.itens.map((i) => `${i.produtoNome} (${i.quantidade})`).join(", "),
            },
            {
              rotulo: "Data",
              render: (v) => dataCurta(momentoNoFuso(new Date(v.ocorridaEm), fuso).data),
            },
            { rotulo: "Pagamento", render: (v) => rotuloDaForma(v.formaPagamento) },
            {
              rotulo: "Total",
              alinharADireita: true,
              render: (v) => dinheiroDeCentavos(v.totalCentavos),
            },
            {
              rotulo: "Situação",
              render: (v) =>
                v.estornadaEm ? (
                  <span className="grid justify-items-start gap-1">
                    <Badge variant="neutral">Estornada</Badge>
                    {v.estornoMotivo && (
                      <span className="text-sm text-muted-foreground">{v.estornoMotivo}</span>
                    )}
                  </span>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setEstornando(v)}>
                    Estornar
                    <span className="sr-only">
                      : {v.itens.map((i) => i.produtoNome).join(", ")}
                    </span>
                  </Button>
                ),
            },
          ]}
        />
      </SecaoAdmin>

      <SecaoAdmin titulo="Histórico de serviços" nota="Atendimentos concluídos">
        <ListaAdaptavel
          descricao="Serviços concluídos"
          linhas={servicos}
          chave={(a) => a.id}
          vazio={
            <EstadoVazio
              titulo="Nenhum serviço concluído."
              texto="Conclua um atendimento na tela Hoje para ele aparecer aqui."
            />
          }
          colunas={[
            { rotulo: "Cliente", principal: true, render: (a) => a.clienteNome },
            { rotulo: "Serviço", render: (a) => a.servicoNome },
            { rotulo: "Data", render: (a) => dataCurta(diaDoAgendamento(a, fuso)) },
            { rotulo: "Pagamento", render: (a) => rotuloDaForma(a.formaPagamento) },
            {
              rotulo: "Valor",
              alinharADireita: true,
              render: (a) => dinheiroDeCentavos(valorCobradoCentavos(a)),
            },
          ]}
        />
      </SecaoAdmin>

      <AlertDialog open={!!estornando} onOpenChange={(aberto) => !aberto && setEstornando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estornar esta venda?</AlertDialogTitle>
            <AlertDialogDescription>
              {estornando
                ? `${estornando.itens.map((i) => i.produtoNome).join(", ")}, ${dinheiroDeCentavos(estornando.totalCentavos)}. A venda continua no histórico, marcada como estornada, e sai do faturamento.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Campo id="estorno-motivo" rotulo="Motivo do estorno" opcional>
            {(props) => (
              <Input
                {...props}
                maxLength={300}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            )}
          </Campo>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter venda</AlertDialogCancel>
            <AlertDialogAction
              onClick={(evento) => {
                evento.preventDefault();
                if (estornando) estorno.mutate({ id: estornando.id, motivo });
              }}
            >
              {estorno.isPending ? "Estornando" : "Estornar venda"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PaginaAdmin>
  );
}
