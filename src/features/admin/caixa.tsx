import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Coins, HandCoins, Plus } from "lucide-react";
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
import { useExpediente } from "@/features/agenda/use-funcionamento";
import { conferirCaixa } from "@/features/financeiro/caixa";
import {
  formasDePagamento,
  rotuloDaForma,
  type FormaPagamento,
} from "@/features/financeiro/formas-de-pagamento";
import { SeletorDeForma } from "@/features/financeiro/seletor-de-forma";
import { dataHoraCurta } from "@/lib/datas";
import { dinheiroDeCentavos, reaisParaCentavos } from "@/lib/dinheiro";
import { chavesDoDono } from "./agenda-do-dono";
import {
  abrirCaixa,
  chavesDoCaixa,
  fecharCaixa,
  lerCaixas,
  lerResumoDoCaixa,
  registrarAtendimentoAvulso,
  type Caixa,
  type ResumoDoCaixa,
} from "./caixa-do-dono";
import { chavesDoCatalogo, lerServicosDoDono } from "./catalogo-do-dono";
import { EstadoVazio, Indicador, SecaoAdmin } from "./componentes";
import { ListaAdaptavel } from "./lista-adaptavel";
import { PaginaAdmin } from "./pagina-admin";

const FUSO_PADRAO = "America/Sao_Paulo";

type Mensagem = { texto: string; erro: boolean };

function Aviso({ mensagem }: { mensagem: Mensagem | null }) {
  if (!mensagem) return null;
  return (
    <p
      role={mensagem.erro ? "alert" : "status"}
      className={`text-base font-semibold ${mensagem.erro ? "text-destructive" : "text-success"}`}
    >
      {mensagem.texto}
    </p>
  );
}

export function CaixaDoDia() {
  const queryClient = useQueryClient();
  const fuso = useExpediente()?.fuso ?? FUSO_PADRAO;
  const caixas = useQuery({ queryKey: chavesDoCaixa.todos, queryFn: lerCaixas });
  const servicos = useQuery({ queryKey: chavesDoCatalogo.servicos, queryFn: lerServicosDoDono });
  const aberto = caixas.data?.find((c) => !c.fechadoEm) ?? null;
  const resumo = useQuery({
    queryKey: chavesDoCaixa.resumo(aberto?.id ?? ""),
    queryFn: () => lerResumoDoCaixa(aberto!.id),
    enabled: !!aberto,
    refetchInterval: 30_000,
  });

  const [troco, setTroco] = useState("0");
  const [contado, setContado] = useState("");
  const [observacao, setObservacao] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [servicoId, setServicoId] = useState("");
  const [nome, setNome] = useState("");
  const [forma, setForma] = useState<FormaPagamento | null>(null);
  const [erroDaForma, setErroDaForma] = useState<string | undefined>();
  const [msgAbrir, setMsgAbrir] = useState<Mensagem | null>(null);
  const [msgFechar, setMsgFechar] = useState<Mensagem | null>(null);
  const [msgAvulso, setMsgAvulso] = useState<Mensagem | null>(null);

  const atualizar = () => {
    void queryClient.invalidateQueries({ queryKey: chavesDoCaixa.todos });
    void queryClient.invalidateQueries({ queryKey: chavesDoDono.agendamentos });
  };

  const abrir = useMutation({
    mutationFn: abrirCaixa,
    onSuccess: () => {
      setMsgAbrir({ texto: "Caixa aberto.", erro: false });
      setMsgFechar(null);
    },
    onError: (e) => setMsgAbrir({ texto: e.message, erro: true }),
    onSettled: atualizar,
  });

  const fechar = useMutation({
    mutationFn: fecharCaixa,
    onSuccess: () => {
      setMsgFechar({ texto: "Caixa fechado.", erro: false });
      setMsgAbrir(null);
      setContado("");
      setObservacao("");
    },
    onError: (e) => setMsgFechar({ texto: e.message, erro: true }),
    onSettled: () => {
      setConfirmando(false);
      atualizar();
    },
  });

  const avulso = useMutation({
    mutationFn: registrarAtendimentoAvulso,
    onSuccess: () => {
      setMsgAvulso({ texto: "Atendimento registrado.", erro: false });
      setNome("");
      setForma(null);
    },
    onError: (e) => setMsgAvulso({ texto: e.message, erro: true }),
    onSettled: atualizar,
  });

  if (caixas.isPending || servicos.isPending) {
    return (
      <PaginaAdmin module="caixa">
        <p className="text-base text-muted-foreground">Carregando.</p>
      </PaginaAdmin>
    );
  }
  if (caixas.isError || servicos.isError) {
    return (
      <PaginaAdmin module="caixa">
        <div className="grid justify-items-start gap-3 rounded-md border-2 border-dashed border-input p-5">
          <p role="alert" className="text-base font-semibold">
            Não conseguimos carregar o caixa agora.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              void caixas.refetch();
              void servicos.refetch();
            }}
          >
            Tentar de novo
          </Button>
        </div>
      </PaginaAdmin>
    );
  }

  const ativos = servicos.data.filter((s) => s.ativo);
  const servicoAtual = ativos.find((s) => s.id === servicoId) ?? ativos[0];
  const fechados = caixas.data.filter((c) => c.fechadoEm);
  const contadoCentavos = contado.trim() === "" ? null : reaisParaCentavos(contado);
  const esperado = resumo.data?.esperadoCentavos ?? null;
  const conferencia =
    contadoCentavos !== null && esperado !== null ? conferirCaixa(contadoCentavos, esperado) : null;

  function enviarAbertura() {
    const centavos = reaisParaCentavos(troco);
    if (centavos === null) {
      setMsgAbrir({
        texto: "Informe o dinheiro inicial em reais. Use 0 se não houver troco.",
        erro: true,
      });
      return;
    }
    setMsgAbrir(null);
    abrir.mutate(centavos);
  }

  function pedirFechamento() {
    if (contadoCentavos === null) {
      setMsgFechar({ texto: "Informe o dinheiro contado, em reais.", erro: true });
      return;
    }
    setMsgFechar(null);
    setConfirmando(true);
  }

  function enviarAvulso() {
    if (!servicoAtual) return;
    if (!forma) {
      setErroDaForma("Escolha como o cliente pagou.");
      return;
    }
    setMsgAvulso(null);
    avulso.mutate({ servicoId: servicoAtual.id, formaPagamento: forma, clienteNome: nome });
  }

  return (
    <PaginaAdmin module="caixa">
      <SecaoAdmin
        titulo={aberto ? "Caixa aberto" : "Caixa fechado"}
        {...(aberto ? { nota: `Desde ${dataHoraCurta(aberto.abertoEm, fuso)}` } : {})}
      >
        {aberto ? (
          <CaixaAberto
            caixa={aberto}
            carregando={resumo.isPending}
            falhou={resumo.isError}
            resumo={resumo.data ?? null}
          />
        ) : (
          <form
            noValidate
            className="grid gap-4 rounded-md border-2 border-foreground bg-card p-4 sm:p-5"
            onSubmit={(e) => {
              e.preventDefault();
              enviarAbertura();
            }}
          >
            <p className="max-w-[60ch] text-base text-muted-foreground">
              Abra o caixa com o dinheiro que está na gaveta. Os pagamentos de atendimentos e vendas
              entram nele até você fechar.
            </p>
            <Campo id="caixa-troco" rotulo="Dinheiro inicial na gaveta (troco)">
              {(props) => (
                <Input
                  {...props}
                  className="sm:max-w-xs"
                  inputMode="decimal"
                  value={troco}
                  onChange={(e) => setTroco(e.target.value)}
                />
              )}
            </Campo>
            <Aviso mensagem={msgAbrir} />
            <div>
              <Button type="submit" disabled={abrir.isPending}>
                <Plus /> {abrir.isPending ? "Abrindo" : "Abrir caixa"}
              </Button>
            </div>
          </form>
        )}
        {!aberto && msgFechar && <Aviso mensagem={msgFechar} />}
      </SecaoAdmin>

      {aberto && (
        <SecaoAdmin titulo="Fechar o caixa" nota="Conte o dinheiro da gaveta">
          <form
            noValidate
            className="grid gap-4 rounded-md border-2 border-foreground bg-card p-4 sm:p-5"
            onSubmit={(e) => {
              e.preventDefault();
              pedirFechamento();
            }}
          >
            <Campo
              id="caixa-contado"
              rotulo="Dinheiro contado"
              {...(esperado !== null
                ? { ajuda: `O sistema espera ${dinheiroDeCentavos(esperado)} na gaveta.` }
                : {})}
            >
              {(props) => (
                <Input
                  {...props}
                  className="sm:max-w-xs"
                  inputMode="decimal"
                  value={contado}
                  onChange={(e) => setContado(e.target.value)}
                />
              )}
            </Campo>
            {conferencia && (
              <p
                role="status"
                className={`text-base font-semibold ${conferencia.tipo === "confere" ? "text-success" : "text-warning"}`}
              >
                {conferencia.texto}
              </p>
            )}
            <Campo id="caixa-observacao" rotulo="Observação" opcional>
              {(props) => (
                <Input
                  {...props}
                  maxLength={300}
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                />
              )}
            </Campo>
            <Aviso mensagem={msgFechar} />
            <div>
              <Button type="submit" variant="secondary" disabled={fechar.isPending}>
                Fechar caixa
              </Button>
            </div>
          </form>
        </SecaoAdmin>
      )}

      <SecaoAdmin titulo="Atendimento sem hora marcada" nota="Cliente que chegou sem agendar">
        {ativos.length === 0 ? (
          <EstadoVazio
            titulo="Nenhum serviço ativo."
            texto="Cadastre ou ative um serviço para registrar atendimentos."
          />
        ) : (
          <form
            noValidate
            className="grid gap-4 rounded-md border-2 border-foreground bg-card p-4 sm:p-5"
            onSubmit={(e) => {
              e.preventDefault();
              enviarAvulso();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo id="avulso-servico" rotulo="Serviço feito">
                {(props) => (
                  <NativeSelect
                    {...props}
                    value={servicoAtual?.id ?? ""}
                    onChange={(e) => setServicoId(e.target.value)}
                  >
                    {ativos.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}, {dinheiroDeCentavos(s.precoCentavos)}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </Campo>
              <Campo id="avulso-nome" rotulo="Nome do cliente" opcional>
                {(props) => (
                  <Input
                    {...props}
                    maxLength={80}
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  />
                )}
              </Campo>
            </div>
            <SeletorDeForma
              valor={forma}
              aoMudar={(escolhida) => {
                setForma(escolhida);
                setErroDaForma(undefined);
              }}
              {...(erroDaForma ? { erro: erroDaForma } : {})}
            />
            <Aviso mensagem={msgAvulso} />
            <div>
              <Button type="submit" disabled={avulso.isPending}>
                <HandCoins /> {avulso.isPending ? "Registrando" : "Registrar atendimento"}
              </Button>
            </div>
          </form>
        )}
      </SecaoAdmin>

      <SecaoAdmin titulo="Caixas fechados">
        <ListaAdaptavel
          descricao="Caixas fechados"
          linhas={fechados}
          chave={(c) => c.id}
          vazio={
            <EstadoVazio
              titulo="Nenhum caixa fechado ainda."
              texto="Quando você fechar um caixa, a conferência dele fica guardada aqui."
            />
          }
          colunas={[
            {
              rotulo: "Aberto em",
              principal: true,
              render: (c) => dataHoraCurta(c.abertoEm, fuso),
            },
            { rotulo: "Fechado em", render: (c) => dataHoraCurta(c.fechadoEm ?? c.abertoEm, fuso) },
            {
              rotulo: "Esperado",
              alinharADireita: true,
              render: (c) => dinheiroDeCentavos(c.esperadoCentavos ?? 0),
            },
            {
              rotulo: "Contado",
              alinharADireita: true,
              render: (c) => dinheiroDeCentavos(c.valorContadoCentavos ?? 0),
            },
            { rotulo: "Conferência", render: (c) => <SeloDaDiferenca caixa={c} /> },
          ]}
        />
      </SecaoAdmin>

      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar o caixa?</AlertDialogTitle>
            <AlertDialogDescription>
              {contadoCentavos !== null && esperado !== null
                ? `Contado ${dinheiroDeCentavos(contadoCentavos)}, esperado ${dinheiroDeCentavos(esperado)}. ${conferirCaixa(contadoCentavos, esperado).texto} Depois de fechar, os pagamentos novos não entram neste caixa.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(evento) => {
                evento.preventDefault();
                if (contadoCentavos !== null) {
                  fechar.mutate({ valorContadoCentavos: contadoCentavos, observacao });
                }
              }}
            >
              {fechar.isPending ? "Fechando" : "Fechar caixa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PaginaAdmin>
  );
}

function SeloDaDiferenca({ caixa }: { caixa: Caixa }) {
  const diferenca = caixa.diferencaCentavos ?? 0;
  if (diferenca === 0) return <Badge variant="success">Confere</Badge>;
  return (
    <Badge variant={diferenca > 0 ? "infoSoft" : "warning"}>
      {diferenca > 0 ? "Sobrou" : "Faltou"} {dinheiroDeCentavos(Math.abs(diferenca))}
    </Badge>
  );
}

function CaixaAberto({
  caixa,
  carregando,
  falhou,
  resumo,
}: {
  caixa: Caixa;
  carregando: boolean;
  falhou: boolean;
  resumo: ResumoDoCaixa | null;
}) {
  if (falhou) {
    return (
      <p role="alert" className="text-base font-semibold text-destructive">
        Não conseguimos calcular o resumo do caixa agora.
      </p>
    );
  }
  if (carregando || !resumo) return <p className="text-base text-muted-foreground">Carregando.</p>;

  const linhas = formasDePagamento.map((f) => ({ forma: f.valor, ...resumo.porForma[f.valor] }));
  const entrou = linhas.reduce((t, l) => t + l.entradasCentavos - l.estornosCentavos, 0);
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador
          rotulo="Dinheiro inicial"
          icone={Coins}
          valor={dinheiroDeCentavos(caixa.valorInicialCentavos)}
          nota="Troco da abertura"
        />
        <Indicador
          rotulo="Entrou no caixa"
          icone={Banknote}
          valor={dinheiroDeCentavos(entrou)}
          nota="Todas as formas, sem os estornos"
        />
        <Indicador
          rotulo="Esperado na gaveta"
          icone={HandCoins}
          valor={dinheiroDeCentavos(resumo.esperadoCentavos)}
          nota="Troco mais o dinheiro que entrou"
        />
      </div>
      <ListaAdaptavel
        descricao="Entradas por forma de pagamento"
        linhas={linhas}
        chave={(l) => l.forma}
        vazio={null}
        colunas={[
          { rotulo: "Forma", principal: true, render: (l) => rotuloDaForma(l.forma) },
          { rotulo: "Pagamentos", alinharADireita: true, render: (l) => String(l.quantidade) },
          {
            rotulo: "Entradas",
            alinharADireita: true,
            render: (l) => dinheiroDeCentavos(l.entradasCentavos),
          },
          {
            rotulo: "Estornos",
            alinharADireita: true,
            render: (l) => dinheiroDeCentavos(l.estornosCentavos),
          },
        ]}
      />
    </div>
  );
}
