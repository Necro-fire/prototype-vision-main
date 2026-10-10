import { EstadoCarregando } from "@/components/ui/carregando";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

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
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useAgora, useExpediente } from "@/features/agenda/use-funcionamento";
import { dataHoraCurta } from "@/lib/datas";
import { cn } from "@/lib/utils";
import {
  chavesDeConfiguracoes,
  criarBloqueio,
  lerBloqueios,
  lerEmpresaDoDono,
  lerFuncionamentoEditavel,
  removerBloqueio,
  salvarEmpresa,
  salvarFuncionamento,
  salvarRegras,
  type BloqueioDoDono,
  type EmpresaDoDono,
} from "./configuracoes-do-dono";
import {
  GRADES,
  nomesDosDias,
  validarBloqueio,
  validarEmpresa,
  validarFuncionamento,
  validarRegras,
  type DiaEditavel,
  type FormularioDaEmpresa,
  type FormularioDeBloqueio,
  type FormularioDeRegras,
} from "./configuracoes-validacao";
import { EstadoVazio, SecaoAdmin } from "./componentes";
import { PainelNoCelular } from "./painel-no-celular";
import { PaginaAdmin } from "./pagina-admin";

const FUSO_PADRAO = "America/Sao_Paulo";

type Aviso = { texto: string; erro: boolean } | null;

function Retorno({ aviso }: { aviso: Aviso }) {
  if (!aviso) return null;
  return (
    <p
      role={aviso.erro ? "alert" : "status"}
      className={cn("text-base font-semibold", aviso.erro ? "text-destructive" : "text-success")}
    >
      {aviso.texto}
    </p>
  );
}

function Cartao({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4 rounded-xl border border-line bg-card p-4 sm:p-5">{children}</div>
  );
}

function Falha({ aoTentar }: { aoTentar: () => void }) {
  return (
    <div className="grid justify-items-start gap-3 rounded-xl border border-dashed border-line bg-card/40 p-5">
      <p role="alert" className="text-base font-semibold">
        Não conseguimos carregar esta parte agora.
      </p>
      <Button variant="outline" onClick={aoTentar}>
        Tentar de novo
      </Button>
    </div>
  );
}

export function Configuracoes() {
  const empresa = useQuery({ queryKey: chavesDeConfiguracoes.empresa, queryFn: lerEmpresaDoDono });
  return (
    <PaginaAdmin module="configuracoes">
      <div className="grid gap-10">
        <SecaoAdmin titulo="Dados da barbearia" nota="Aparecem na página de contato do site">
          {empresa.isError ? (
            <Falha aoTentar={() => void empresa.refetch()} />
          ) : empresa.isPending ? (
            <EstadoCarregando texto="Carregando." />
          ) : (
            <FormularioDaBarbearia empresa={empresa.data} />
          )}
        </SecaoAdmin>

        <SecaoAdmin
          titulo="Horário de funcionamento"
          nota="A agenda do site mostra só os horários dentro destes limites"
        >
          <FuncionamentoSecao />
        </SecaoAdmin>

        <SecaoAdmin titulo="Regras da agenda">
          {empresa.isError ? (
            <Falha aoTentar={() => void empresa.refetch()} />
          ) : empresa.isPending ? (
            <EstadoCarregando texto="Carregando." />
          ) : (
            <FormularioDeRegrasDaAgenda empresa={empresa.data} />
          )}
        </SecaoAdmin>

        <SecaoAdmin
          titulo="Bloqueios e folgas"
          nota="Feriado, férias ou saída: o período some da agenda do site"
        >
          <BloqueiosSecao />
        </SecaoAdmin>

        <SecaoAdmin titulo="Painel no celular" nota="Instalação na tela inicial">
          <PainelNoCelular />
        </SecaoAdmin>
      </div>
    </PaginaAdmin>
  );
}

// ---- Dados da barbearia ---------------------------------------------------------------------

function FormularioDaBarbearia({ empresa }: { empresa: EmpresaDoDono }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormularioDaEmpresa>({
    nome: empresa.nome,
    endereco: empresa.endereco ?? "",
    telefone: empresa.telefone ?? "",
    whatsapp: empresa.whatsapp ?? "",
    instagram: empresa.instagram ?? "",
  });
  const [erros, setErros] = useState<Partial<Record<keyof FormularioDaEmpresa, string>>>({});
  const [aviso, setAviso] = useState<Aviso>(null);

  const salvar = useMutation({
    mutationFn: salvarEmpresa,
    onSuccess: () => {
      setAviso({ texto: "Dados salvos. O site já mostra os novos.", erro: false });
      void queryClient.invalidateQueries({ queryKey: chavesDeConfiguracoes.empresa });
    },
    onError: (e) => setAviso({ texto: e.message, erro: true }),
  });

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const { erros: encontrados, dados } = validarEmpresa(form);
    setErros(encontrados);
    setAviso(null);
    if (dados) salvar.mutate(dados);
  }
  const mudar = (parte: Partial<FormularioDaEmpresa>) => setForm({ ...form, ...parte });
  const campo = (chave: keyof FormularioDaEmpresa) => (erros[chave] ? { erro: erros[chave] } : {});

  return (
    <form noValidate onSubmit={enviar}>
      <Cartao>
        <Campo id="empresa-nome" rotulo="Nome" {...campo("nome")}>
          {(props) => (
            <Input {...props} value={form.nome} onChange={(e) => mudar({ nome: e.target.value })} />
          )}
        </Campo>
        <Campo id="empresa-endereco" rotulo="Endereço" opcional {...campo("endereco")}>
          {(props) => (
            <Input
              {...props}
              autoComplete="street-address"
              value={form.endereco}
              onChange={(e) => mudar({ endereco: e.target.value })}
            />
          )}
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="empresa-telefone" rotulo="Telefone" opcional {...campo("telefone")}>
            {(props) => (
              <Input
                {...props}
                type="tel"
                inputMode="tel"
                value={form.telefone}
                onChange={(e) => mudar({ telefone: e.target.value })}
              />
            )}
          </Campo>
          <Campo id="empresa-whatsapp" rotulo="WhatsApp" opcional {...campo("whatsapp")}>
            {(props) => (
              <Input
                {...props}
                type="tel"
                inputMode="tel"
                value={form.whatsapp}
                onChange={(e) => mudar({ whatsapp: e.target.value })}
              />
            )}
          </Campo>
        </div>
        <Campo
          id="empresa-instagram"
          rotulo="Instagram"
          opcional
          ajuda="Só o usuário, por exemplo onstyle."
          {...campo("instagram")}
        >
          {(props) => (
            <Input
              {...props}
              value={form.instagram}
              onChange={(e) => mudar({ instagram: e.target.value })}
            />
          )}
        </Campo>
        <Retorno aviso={aviso} />
        <div>
          <Button type="submit" disabled={salvar.isPending}>
            {salvar.isPending ? "Salvando" : "Salvar dados"}
          </Button>
        </div>
      </Cartao>
    </form>
  );
}

// ---- Funcionamento --------------------------------------------------------------------------

function FuncionamentoSecao() {
  const consulta = useQuery({
    queryKey: chavesDeConfiguracoes.funcionamento,
    queryFn: lerFuncionamentoEditavel,
  });
  if (consulta.isError) return <Falha aoTentar={() => void consulta.refetch()} />;
  if (consulta.isPending) return <EstadoCarregando texto="Carregando." />;
  return <FormularioDeFuncionamento inicial={consulta.data} />;
}

function FormularioDeFuncionamento({ inicial }: { inicial: DiaEditavel[] }) {
  const queryClient = useQueryClient();
  const [dias, setDias] = useState<DiaEditavel[]>(inicial);
  const [erros, setErros] = useState<(string | undefined)[]>([]);
  const [aviso, setAviso] = useState<Aviso>(null);

  const salvar = useMutation({
    mutationFn: salvarFuncionamento,
    onSuccess: () => {
      setAviso({ texto: "Horários salvos. A agenda do site já usa os novos.", erro: false });
      void queryClient.invalidateQueries({ queryKey: chavesDeConfiguracoes.funcionamento });
    },
    onError: (e) => setAviso({ texto: e.message, erro: true }),
  });

  const mudarDia = (n: number, parte: Partial<DiaEditavel>) =>
    setDias(dias.map((d, i) => (i === n ? { ...d, ...parte } : d)));

  function enviar() {
    const { erros: encontrados, valido, intervalos } = validarFuncionamento(dias);
    setErros(encontrados);
    setAviso(null);
    if (valido) salvar.mutate(intervalos);
  }

  // Segunda a domingo na tela, na ordem de quem usa a agenda; o banco usa 0 = domingo.
  const ordem = [1, 2, 3, 4, 5, 6, 0];

  return (
    <Cartao>
      <ul className="grid gap-4">
        {ordem.map((n) => {
          const dia = dias[n]!;
          const nome = nomesDosDias[n]!;
          return (
            <li
              key={n}
              className="grid gap-2 border-b border-border pb-4 last:border-b-0 last:pb-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base font-semibold">
                  <input
                    type="checkbox"
                    checked={dia.aberto}
                    onChange={(e) =>
                      mudarDia(n, {
                        aberto: e.target.checked,
                        intervalos:
                          e.target.checked && dia.intervalos.length === 0
                            ? [{ abre: "09:00", fecha: "19:00" }]
                            : dia.intervalos,
                      })
                    }
                    className="size-6 shrink-0 accent-foreground"
                  />
                  {nome}
                </label>
                {!dia.aberto && <span className="text-base text-muted-foreground">Fechado</span>}
              </div>
              {dia.aberto && (
                <div className="grid gap-2">
                  {dia.intervalos.map((i, k) => (
                    <div key={k} className="flex flex-wrap items-end gap-3">
                      <Campo id={`abre-${n}-${k}`} rotulo={`${nome}: abre`}>
                        {(props) => (
                          <Input
                            {...props}
                            type="time"
                            className="w-auto"
                            value={i.abre}
                            onChange={(e) =>
                              mudarDia(n, {
                                intervalos: dia.intervalos.map((x, j) =>
                                  j === k ? { ...x, abre: e.target.value } : x,
                                ),
                              })
                            }
                          />
                        )}
                      </Campo>
                      <Campo id={`fecha-${n}-${k}`} rotulo={`${nome}: fecha`}>
                        {(props) => (
                          <Input
                            {...props}
                            type="time"
                            className="w-auto"
                            value={i.fecha}
                            onChange={(e) =>
                              mudarDia(n, {
                                intervalos: dia.intervalos.map((x, j) =>
                                  j === k ? { ...x, fecha: e.target.value } : x,
                                ),
                              })
                            }
                          />
                        )}
                      </Campo>
                      {dia.intervalos.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Remover o horário ${k + 1} de ${nome}`}
                          onClick={() =>
                            mudarDia(n, { intervalos: dia.intervalos.filter((_, j) => j !== k) })
                          }
                        >
                          <Trash2 />
                        </Button>
                      )}
                    </div>
                  ))}
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        mudarDia(n, {
                          intervalos: [...dia.intervalos, { abre: "14:00", fecha: "18:00" }],
                        })
                      }
                    >
                      <Plus /> Adicionar horário
                      <span className="sr-only"> em {nome}, por exemplo para o almoço</span>
                    </Button>
                  </div>
                </div>
              )}
              {erros[n] && (
                <p role="alert" className="text-sm font-semibold text-destructive">
                  {nome}: {erros[n]}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-muted-foreground">
        Para o almoço, deixe dois horários no mesmo dia: o espaço entre eles fica fechado.
      </p>
      <Retorno aviso={aviso} />
      <div>
        <Button onClick={enviar} disabled={salvar.isPending}>
          {salvar.isPending ? "Salvando" : "Salvar horários"}
        </Button>
      </div>
    </Cartao>
  );
}

// ---- Regras da agenda -----------------------------------------------------------------------

function FormularioDeRegrasDaAgenda({ empresa }: { empresa: EmpresaDoDono }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormularioDeRegras>({
    grade: String(empresa.gradeMinutos),
    antecedencia: String(empresa.antecedenciaMaxDias),
    limite: String(empresa.maxAgendamentosFuturos),
  });
  const [erros, setErros] = useState<Partial<Record<keyof FormularioDeRegras, string>>>({});
  const [aviso, setAviso] = useState<Aviso>(null);

  const salvar = useMutation({
    mutationFn: salvarRegras,
    onSuccess: () => {
      setAviso({ texto: "Regras salvas.", erro: false });
      void queryClient.invalidateQueries({ queryKey: chavesDeConfiguracoes.empresa });
    },
    onError: (e) => setAviso({ texto: e.message, erro: true }),
  });

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const { erros: encontrados, dados } = validarRegras(form);
    setErros(encontrados);
    setAviso(null);
    if (dados) salvar.mutate(dados);
  }
  const campo = (chave: keyof FormularioDeRegras) => (erros[chave] ? { erro: erros[chave] } : {});

  return (
    <form noValidate onSubmit={enviar}>
      <Cartao>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo
            id="regra-grade"
            rotulo="Intervalo entre horários"
            ajuda="De quanto em quanto tempo o cliente pode marcar."
            {...campo("grade")}
          >
            {(props) => (
              <NativeSelect
                {...props}
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
              >
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g} minutos
                  </option>
                ))}
              </NativeSelect>
            )}
          </Campo>
          <Campo
            id="regra-antecedencia"
            rotulo="Agenda aberta até (dias)"
            ajuda="Quantos dias à frente o cliente vê."
            {...campo("antecedencia")}
          >
            {(props) => (
              <Input
                {...props}
                inputMode="numeric"
                value={form.antecedencia}
                onChange={(e) => setForm({ ...form, antecedencia: e.target.value })}
              />
            )}
          </Campo>
          <Campo
            id="regra-limite"
            rotulo="Horários futuros por cliente"
            ajuda="Evita que uma conta tome a agenda."
            {...campo("limite")}
          >
            {(props) => (
              <Input
                {...props}
                inputMode="numeric"
                value={form.limite}
                onChange={(e) => setForm({ ...form, limite: e.target.value })}
              />
            )}
          </Campo>
        </div>
        <Retorno aviso={aviso} />
        <div>
          <Button type="submit" disabled={salvar.isPending}>
            {salvar.isPending ? "Salvando" : "Salvar regras"}
          </Button>
        </div>
      </Cartao>
    </form>
  );
}

// ---- Bloqueios ------------------------------------------------------------------------------

const bloqueioEmBranco: FormularioDeBloqueio = {
  dataInicial: "",
  dataFinal: "",
  diaInteiro: true,
  horaInicial: "12:00",
  horaFinal: "14:00",
  motivo: "",
};

function BloqueiosSecao() {
  const queryClient = useQueryClient();
  const fuso = useExpediente()?.fuso ?? FUSO_PADRAO;
  const agora = useAgora();
  const consulta = useQuery({ queryKey: chavesDeConfiguracoes.bloqueios, queryFn: lerBloqueios });
  const [form, setForm] = useState<FormularioDeBloqueio>(bloqueioEmBranco);
  const [erros, setErros] = useState<
    Partial<Record<"dataInicial" | "dataFinal" | "horaInicial" | "horaFinal", string>>
  >({});
  const [aviso, setAviso] = useState<Aviso>(null);
  const [removendo, setRemovendo] = useState<BloqueioDoDono | null>(null);

  const recarregar = () => {
    void queryClient.invalidateQueries({ queryKey: chavesDeConfiguracoes.bloqueios });
    void queryClient.invalidateQueries({ queryKey: ["ocupados"] });
  };

  const criar = useMutation({
    mutationFn: criarBloqueio,
    onSuccess: () => {
      setForm(bloqueioEmBranco);
      setAviso({ texto: "Período bloqueado. Ele some da agenda do site.", erro: false });
      recarregar();
    },
    onError: (e) => setAviso({ texto: e.message, erro: true }),
  });

  const remover = useMutation({
    mutationFn: removerBloqueio,
    onSuccess: () => setAviso({ texto: "Bloqueio removido.", erro: false }),
    onError: (e) => setAviso({ texto: e.message, erro: true }),
    onSettled: () => {
      setRemovendo(null);
      recarregar();
    },
  });

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const { erros: encontrados, dados } = validarBloqueio(form, fuso);
    setErros(encontrados);
    setAviso(null);
    if (dados) criar.mutate(dados);
  }
  const campo = (chave: keyof typeof erros) => (erros[chave] ? { erro: erros[chave] } : {});

  // Só o que ainda não terminou; o passado não ajuda a ninguém.
  const pendentes = (consulta.data ?? []).filter(
    (b) => agora === null || new Date(b.fim).getTime() > agora.getTime(),
  );

  return (
    <div className="grid gap-4">
      <form noValidate onSubmit={enviar}>
        <Cartao>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="bloqueio-inicial" rotulo="De (data)" {...campo("dataInicial")}>
              {(props) => (
                <Input
                  {...props}
                  type="date"
                  value={form.dataInicial}
                  onChange={(e) => setForm({ ...form, dataInicial: e.target.value })}
                />
              )}
            </Campo>
            <Campo
              id="bloqueio-final"
              rotulo="Até (data)"
              opcional
              ajuda="Em branco, vale só o primeiro dia."
              {...campo("dataFinal")}
            >
              {(props) => (
                <Input
                  {...props}
                  type="date"
                  value={form.dataFinal}
                  onChange={(e) => setForm({ ...form, dataFinal: e.target.value })}
                />
              )}
            </Campo>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base font-semibold">
            <input
              type="checkbox"
              checked={form.diaInteiro}
              onChange={(e) => setForm({ ...form, diaInteiro: e.target.checked })}
              className="size-6 shrink-0 accent-foreground"
            />
            Dia inteiro
          </label>
          {!form.diaInteiro && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo id="bloqueio-hora-inicial" rotulo="Das" {...campo("horaInicial")}>
                {(props) => (
                  <Input
                    {...props}
                    type="time"
                    value={form.horaInicial}
                    onChange={(e) => setForm({ ...form, horaInicial: e.target.value })}
                  />
                )}
              </Campo>
              <Campo id="bloqueio-hora-final" rotulo="Às" {...campo("horaFinal")}>
                {(props) => (
                  <Input
                    {...props}
                    type="time"
                    value={form.horaFinal}
                    onChange={(e) => setForm({ ...form, horaFinal: e.target.value })}
                  />
                )}
              </Campo>
            </div>
          )}
          <Campo id="bloqueio-motivo" rotulo="Motivo" opcional>
            {(props) => (
              <Input
                {...props}
                placeholder="Feriado, férias, médico..."
                value={form.motivo}
                onChange={(e) => setForm({ ...form, motivo: e.target.value })}
              />
            )}
          </Campo>
          <Retorno aviso={aviso} />
          <div>
            <Button type="submit" disabled={criar.isPending}>
              {criar.isPending ? "Bloqueando" : "Bloquear período"}
            </Button>
          </div>
        </Cartao>
      </form>

      {consulta.isError ? (
        <Falha aoTentar={() => void consulta.refetch()} />
      ) : consulta.isPending ? (
        <EstadoCarregando texto="Carregando os bloqueios." />
      ) : pendentes.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum bloqueio pela frente."
          texto="Quando a barbearia for fechar num feriado ou nas férias, bloqueie o período aqui."
        />
      ) : (
        <ul aria-label="Bloqueios" className="grid gap-3">
          {pendentes.map((b) => (
            <li
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card p-4"
            >
              <div className="grid gap-0.5">
                <strong className="font-display text-lg font-bold">
                  {b.motivo || "Sem motivo informado"}
                </strong>
                <span className="text-base">
                  {dataHoraCurta(b.inicio, fuso)} até {dataHoraCurta(b.fim, fuso)}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setRemovendo(b)}>
                Remover
                <span className="sr-only"> bloqueio: {b.motivo || "sem motivo"}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={!!removendo} onOpenChange={(a) => !a && setRemovendo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover este bloqueio?</AlertDialogTitle>
            <AlertDialogDescription>
              {removendo
                ? `${removendo.motivo || "Sem motivo"}, ${dataHoraCurta(removendo.inicio, fuso)} até ${dataHoraCurta(removendo.fim, fuso)}. Os horários voltam a aparecer na agenda do site.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter bloqueio</AlertDialogCancel>
            <AlertDialogAction
              onClick={(evento) => {
                evento.preventDefault();
                if (removendo) remover.mutate(removendo.id);
              }}
            >
              {remover.isPending ? "Removendo" : "Remover bloqueio"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
