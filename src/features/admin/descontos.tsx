import { EstadoCarregando } from "@/components/ui/carregando";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { momentoNoFuso } from "@/features/agenda/expediente";
import { instanteNoFuso } from "@/features/agenda/horarios-livres";
import { useExpediente } from "@/features/agenda/use-funcionamento";
import {
  codigoDeCupomValido,
  descreverDesconto,
  normalizarCodigo,
  rotuloDaSituacaoDoCupom,
  type SituacaoDoCupom,
  type TipoDeCupom,
} from "@/features/descontos/cupons";
import { chavesDeFidelidade, useRegraDeFidelidade } from "@/features/fidelidade/banco";
import { dataCurta } from "@/lib/datas";
import { dinheiroDeCentavos, reaisParaCentavos } from "@/lib/dinheiro";
import { chavesDoCatalogo, lerServicosDoDono } from "./catalogo-do-dono";
import { EstadoVazio, SecaoAdmin } from "./componentes";
import {
  chavesDeDescontos,
  criarCupom,
  lerCupons,
  mudarCupomAtivo,
  salvarFidelidade,
  type CupomDoDono,
} from "./descontos-do-dono";
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

const variantePorSituacao: Record<SituacaoDoCupom, "success" | "neutral" | "warning"> = {
  ativo: "success",
  inativo: "neutral",
  vencido: "warning",
  esgotado: "warning",
};

export function Descontos() {
  const fuso = useExpediente()?.fuso ?? FUSO_PADRAO;
  const cupons = useQuery({ queryKey: chavesDeDescontos.cupons, queryFn: lerCupons });

  if (cupons.isPending) {
    return (
      <PaginaAdmin module="descontos">
        <EstadoCarregando texto="Carregando." />
      </PaginaAdmin>
    );
  }
  if (cupons.isError) {
    return (
      <PaginaAdmin module="descontos">
        <div className="grid justify-items-start gap-3 rounded-xl border border-dashed border-line bg-card/40 p-5">
          <p role="alert" className="text-base font-semibold">
            Não conseguimos carregar os cupons agora.
          </p>
          <Button variant="outline" onClick={() => void cupons.refetch()}>
            Tentar de novo
          </Button>
        </div>
      </PaginaAdmin>
    );
  }

  return (
    <PaginaAdmin module="descontos">
      <NovoCupom fuso={fuso} />
      <ListaDeCupons cupons={cupons.data} fuso={fuso} />
      <CartaoFidelidade />
    </PaginaAdmin>
  );
}

function NovoCupom({ fuso }: { fuso: string }) {
  const queryClient = useQueryClient();
  const [codigo, setCodigo] = useState("");
  const [tipo, setTipo] = useState<TipoDeCupom>("percentual");
  const [valor, setValor] = useState("");
  const [validade, setValidade] = useState("");
  const [limite, setLimite] = useState("");
  const [erros, setErros] = useState<Partial<Record<"codigo" | "valor" | "limite", string>>>({});
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);

  const criar = useMutation({
    mutationFn: criarCupom,
    onSuccess: () => {
      setMensagem({ texto: "Cupom criado.", erro: false });
      setCodigo("");
      setValor("");
      setValidade("");
      setLimite("");
    },
    onError: (e) => setMensagem({ texto: e.message, erro: true }),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: chavesDeDescontos.cupons }),
  });

  function enviar() {
    setMensagem(null);
    const novos: typeof erros = {};
    if (!codigoDeCupomValido(codigo)) {
      novos.codigo = "Use de 3 a 20 letras, números, hífen ou sublinhado, sem espaços.";
    }
    let numero: number | null;
    if (tipo === "percentual") {
      const n = Number(valor);
      numero = Number.isInteger(n) && n >= 1 && n <= 100 ? n : null;
      if (numero === null) novos.valor = "Informe um percentual inteiro de 1 a 100.";
    } else {
      numero = reaisParaCentavos(valor);
      if (numero === null || numero <= 0) {
        numero = null;
        novos.valor = "Informe o valor do desconto, em reais.";
      }
    }
    let limiteUsos: number | null = null;
    if (limite.trim() !== "") {
      const n = Number(limite);
      if (Number.isInteger(n) && n >= 1) limiteUsos = n;
      else novos.limite = "O limite precisa ser um número inteiro de pelo menos 1.";
    }
    setErros(novos);
    if (Object.keys(novos).length > 0 || numero === null) return;
    // "Válido até" vale o dia inteiro, no horário da barbearia.
    const validoAte = validade
      ? new Date(instanteNoFuso(validade, 1440, fuso)).toISOString()
      : null;
    criar.mutate({ codigo: normalizarCodigo(codigo), tipo, valor: numero, validoAte, limiteUsos });
  }

  return (
    <SecaoAdmin
      titulo="Novo cupom"
      nota="O cliente digita o código ao agendar; você também pode aplicar na hora de cobrar"
    >
      <form
        noValidate
        className="grid gap-4 rounded-xl border border-line bg-card p-4 sm:grid-cols-2 sm:p-5"
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
      >
        <Campo id="cupom-codigo" rotulo="Código" {...(erros.codigo ? { erro: erros.codigo } : {})}>
          {(props) => (
            <Input
              {...props}
              className="uppercase"
              autoComplete="off"
              maxLength={20}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
            />
          )}
        </Campo>
        <Campo id="cupom-tipo" rotulo="Tipo de desconto">
          {(props) => (
            <NativeSelect
              {...props}
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoDeCupom)}
            >
              <option value="percentual">Percentual do valor</option>
              <option value="valor">Valor fixo em reais</option>
            </NativeSelect>
          )}
        </Campo>
        <Campo
          id="cupom-valor"
          rotulo={tipo === "percentual" ? "Percentual (1 a 100)" : "Valor do desconto (R$)"}
          {...(erros.valor ? { erro: erros.valor } : {})}
        >
          {(props) => (
            <Input
              {...props}
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          )}
        </Campo>
        <Campo
          id="cupom-validade"
          rotulo="Válido até"
          opcional
          ajuda="O cupom vale durante todo esse dia."
        >
          {(props) => (
            <Input
              {...props}
              type="date"
              value={validade}
              onChange={(e) => setValidade(e.target.value)}
            />
          )}
        </Campo>
        <Campo
          id="cupom-limite"
          rotulo="Limite de usos"
          opcional
          ajuda="Cancelar um horário devolve o uso. Sem limite, deixe em branco."
          {...(erros.limite ? { erro: erros.limite } : {})}
        >
          {(props) => (
            <Input
              {...props}
              inputMode="numeric"
              value={limite}
              onChange={(e) => setLimite(e.target.value)}
            />
          )}
        </Campo>
        <div className="grid content-end gap-3 sm:col-span-2">
          <Aviso mensagem={mensagem} />
          <div>
            <Button type="submit" disabled={criar.isPending}>
              <Plus /> {criar.isPending ? "Criando" : "Criar cupom"}
            </Button>
          </div>
        </div>
      </form>
    </SecaoAdmin>
  );
}

function ListaDeCupons({ cupons, fuso }: { cupons: CupomDoDono[]; fuso: string }) {
  const queryClient = useQueryClient();
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);
  const mudar = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => mudarCupomAtivo(id, ativo),
    onError: (e) => setMensagem({ texto: e.message, erro: true }),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: chavesDeDescontos.cupons }),
  });

  return (
    <SecaoAdmin titulo="Cupons" nota="Nada se apaga: desligue o que não vale mais">
      <Aviso mensagem={mensagem} />
      <ListaAdaptavel
        descricao="Cupons de desconto"
        linhas={cupons}
        chave={(c) => c.id}
        vazio={
          <EstadoVazio
            titulo="Nenhum cupom criado."
            texto="Crie um cupom acima para dar um desconto em um atendimento ou venda."
          />
        }
        colunas={[
          { rotulo: "Código", principal: true, render: (c) => <strong>{c.codigo}</strong> },
          {
            rotulo: "Desconto",
            render: (c) => descreverDesconto(c.tipo, c.valor, dinheiroDeCentavos),
          },
          {
            rotulo: "Válido até",
            render: (c) =>
              c.validoAte
                ? dataCurta(momentoNoFuso(new Date(new Date(c.validoAte).getTime() - 1), fuso).data)
                : "Sem prazo",
          },
          {
            rotulo: "Usos",
            alinharADireita: true,
            render: (c) =>
              c.limiteUsos === null ? String(c.usos) : `${c.usos} de ${c.limiteUsos}`,
          },
          {
            rotulo: "Situação",
            render: (c) => (
              <Badge variant={variantePorSituacao[c.situacao]}>
                {rotuloDaSituacaoDoCupom[c.situacao]}
              </Badge>
            ),
          },
          {
            rotulo: "Ação",
            render: (c) => (
              <Button
                variant="outline"
                size="sm"
                disabled={mudar.isPending}
                onClick={() => {
                  setMensagem(null);
                  mudar.mutate({ id: c.id, ativo: !c.ativo });
                }}
              >
                {c.ativo ? "Desligar" : "Ligar"}
                <span className="sr-only"> o cupom {c.codigo}</span>
              </Button>
            ),
          },
        ]}
      />
    </SecaoAdmin>
  );
}

function CartaoFidelidade() {
  const queryClient = useQueryClient();
  const regra = useRegraDeFidelidade();
  const servicos = useQuery({ queryKey: chavesDoCatalogo.servicos, queryFn: lerServicosDoDono });
  const [edicao, setEdicao] = useState<{
    ativa?: boolean;
    atendimentos?: string;
    servicoId?: string;
  }>({});
  const [erro, setErro] = useState<string | undefined>();
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);

  const salvar = useMutation({
    mutationFn: salvarFidelidade,
    onSuccess: () => {
      setMensagem({ texto: "Cartão fidelidade salvo.", erro: false });
      setEdicao({});
    },
    onError: (e) => setMensagem({ texto: e.message, erro: true }),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: chavesDeFidelidade.regra }),
  });

  if (regra.isPending || servicos.isPending) {
    return (
      <SecaoAdmin titulo="Cartão fidelidade">
        <EstadoCarregando texto="Carregando." />
      </SecaoAdmin>
    );
  }
  if (regra.isError || servicos.isError || !regra.data) {
    return (
      <SecaoAdmin titulo="Cartão fidelidade">
        <p role="alert" className="text-base font-semibold">
          Não conseguimos carregar o cartão fidelidade agora.
        </p>
      </SecaoAdmin>
    );
  }

  const ativos = servicos.data.filter((s) => s.ativo || s.id === regra.data?.servicoId);
  const ativa = edicao.ativa ?? regra.data.ativa;
  const atendimentos = edicao.atendimentos ?? String(regra.data.atendimentos);
  const servicoId = edicao.servicoId ?? regra.data.servicoId ?? "";

  function enviar() {
    setMensagem(null);
    const n = Number(atendimentos);
    if (!Number.isInteger(n) || n < 2 || n > 100) {
      setErro("Informe de 2 a 100 atendimentos.");
      return;
    }
    if (ativa && !servicoId) {
      setErro("Escolha o serviço que sai de graça.");
      return;
    }
    setErro(undefined);
    salvar.mutate({ ativa, atendimentos: n, servicoId: servicoId || null });
  }

  return (
    <SecaoAdmin
      titulo="Cartão fidelidade"
      nota="Cada atendimento concluído vale um ponto; cancelados e faltas não contam"
    >
      <form
        noValidate
        className="grid gap-4 rounded-xl border border-line bg-card p-4 sm:grid-cols-2 sm:p-5"
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
      >
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base font-semibold sm:col-span-2">
          <input
            type="checkbox"
            className="size-5 shrink-0 accent-primary"
            checked={ativa}
            onChange={(e) => setEdicao({ ...edicao, ativa: e.target.checked })}
          />
          Cartão fidelidade ligado
        </label>
        <Campo
          id="fidelidade-n"
          rotulo="Atendimentos para ganhar o serviço grátis"
          {...(erro ? { erro } : {})}
        >
          {(props) => (
            <Input
              {...props}
              inputMode="numeric"
              value={atendimentos}
              onChange={(e) => setEdicao({ ...edicao, atendimentos: e.target.value })}
            />
          )}
        </Campo>
        <Campo id="fidelidade-servico" rotulo="Serviço grátis">
          {(props) => (
            <NativeSelect
              {...props}
              value={servicoId}
              onChange={(e) => setEdicao({ ...edicao, servicoId: e.target.value })}
            >
              <option value="">Escolha um serviço</option>
              {ativos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </NativeSelect>
          )}
        </Campo>
        <div className="grid gap-3 sm:col-span-2">
          <p className="text-base text-muted-foreground">
            O cliente vê o cartão em Meus horários. Para usar os pontos, conclua o atendimento do
            serviço grátis e marque o uso do cartão na hora de cobrar. O atendimento pago com pontos
            não rende ponto, e quem não tem conta não acumula.
          </p>
          <Aviso mensagem={mensagem} />
          <div>
            <Button type="submit" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando" : "Salvar cartão fidelidade"}
            </Button>
          </div>
        </div>
      </form>
    </SecaoAdmin>
  );
}
