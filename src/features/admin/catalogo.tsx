import { EstadoCarregando } from "@/components/ui/carregando";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Miniatura } from "@/components/miniatura";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { CampoDeFoto } from "./campo-de-foto";
import { semMudancaDeFoto, type MudancaDeFoto } from "./fotos-do-catalogo";
import { centavosParaCampo, precoCurtoDeCentavos } from "@/lib/dinheiro";
import {
  chavesDoCatalogo,
  lerCategoriasDoDono,
  lerProdutosDoDono,
  lerServicosDoDono,
  mudarAtivo,
  mudarDestaque,
  salvarProduto,
  salvarServico,
  type ProdutoDoDono,
  type ServicoDoDono,
} from "./catalogo-do-dono";
import {
  validarProduto,
  validarServico,
  type ErrosDoCadastro,
  type FormularioDeProduto,
  type FormularioDeServico,
} from "./catalogo-validacao";
import { BarraDeFiltros, EstadoVazio } from "./componentes";
import { ListaAdaptavel, type Coluna } from "./lista-adaptavel";
import { PaginaAdmin } from "./pagina-admin";

// Serviços e produtos têm a mesma tela; muda a lista e os campos do cadastro.
export function Catalogo({ module }: { module: "servicos" | "produtos" }) {
  return module === "servicos" ? <CatalogoDeServicos /> : <CatalogoDeProdutos />;
}

function BotaoDeLigar({
  ligado,
  rotulo,
  textoLigado,
  textoDesligado,
  aoMudar,
  desabilitado,
}: {
  ligado: boolean;
  rotulo: string;
  textoLigado: string;
  textoDesligado: string;
  aoMudar: () => void;
  desabilitado: boolean;
}) {
  return (
    <Button
      variant={ligado ? "outline" : "ghost"}
      size="sm"
      aria-pressed={ligado}
      aria-label={rotulo}
      disabled={desabilitado}
      onClick={aoMudar}
    >
      <span
        aria-hidden="true"
        className={`size-2.5 ${ligado ? "bg-success" : "bg-muted-foreground"}`}
      />
      {ligado ? textoLigado : textoDesligado}
    </Button>
  );
}

function Busca({
  valor,
  aoMudar,
  total,
}: {
  valor: string;
  aoMudar: (v: string) => void;
  total: number;
}) {
  return (
    <BarraDeFiltros>
      <div className="relative sm:min-w-64 sm:max-w-md sm:flex-1">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          className="pl-11"
          aria-label="Pesquisar catálogo"
          placeholder="Buscar no catálogo"
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
        />
      </div>
      <p className="text-base text-muted-foreground sm:ml-auto">{total} itens cadastrados</p>
    </BarraDeFiltros>
  );
}

function Carregando({
  module,
  erro,
  aoTentar,
}: {
  module: string;
  erro: boolean;
  aoTentar: () => void;
}) {
  return (
    <PaginaAdmin module={module}>
      {erro ? (
        <div className="grid justify-items-start gap-3 rounded-xl border border-dashed border-line bg-card/40 p-5">
          <p role="alert" className="text-base font-semibold">
            Não conseguimos carregar o catálogo agora.
          </p>
          <Button variant="outline" onClick={aoTentar}>
            Tentar de novo
          </Button>
        </div>
      ) : (
        <EstadoCarregando texto="Carregando o catálogo." />
      )}
    </PaginaAdmin>
  );
}

function Cadastro({
  aberto,
  titulo,
  aoFechar,
  children,
}: {
  aberto: boolean;
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && aoFechar()}>
      <DialogContent className="max-h-dvh overflow-y-auto">
        <DialogTitle>{titulo}</DialogTitle>
        <DialogDescription>
          As alterações aparecem no catálogo do site assim que você salvar.
        </DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}

// ---- Serviços -------------------------------------------------------------------------------

const servicoEmBranco: FormularioDeServico = {
  nome: "",
  categoriaId: "",
  novaCategoria: "",
  descricao: "",
  preco: "",
  duracao: "30",
  destaque: false,
  ordem: "",
};

const deServico = (s: ServicoDoDono): FormularioDeServico => ({
  nome: s.nome,
  categoriaId: s.categoriaId ?? "",
  novaCategoria: "",
  descricao: s.descricao,
  preco: centavosParaCampo(s.precoCentavos),
  duracao: String(s.duracaoMinutos),
  destaque: s.destaque,
  ordem: String(s.ordem),
});

function CatalogoDeServicos() {
  const queryClient = useQueryClient();
  const servicos = useQuery({ queryKey: chavesDoCatalogo.servicos, queryFn: lerServicosDoDono });
  const categorias = useQuery({
    queryKey: chavesDoCatalogo.categorias,
    queryFn: lerCategoriasDoDono,
  });
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<{
    id: string | null;
    form: FormularioDeServico;
    fotoAtual: string | null;
    foto: MudancaDeFoto;
  } | null>(null);
  const [erros, setErros] = useState<ErrosDoCadastro>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState("");

  const recarregar = () => {
    void queryClient.invalidateQueries({ queryKey: chavesDoCatalogo.servicos });
    void queryClient.invalidateQueries({ queryKey: chavesDoCatalogo.categorias });
  };

  const salvar = useMutation({
    mutationFn: (alvo: {
      id: string | null;
      form: FormularioDeServico;
      fotoAtual: string | null;
      foto: MudancaDeFoto;
    }) => {
      const { dados } = validarServico(alvo.form);
      if (!dados) throw new Error("Confira os campos.");
      return salvarServico(alvo.id, dados, { mudanca: alvo.foto, atual: alvo.fotoAtual });
    },
    onSuccess: () => {
      setEditando(null);
      setMensagem("Serviço salvo.");
      recarregar();
    },
    onError: (e) => setErroGeral(e.message),
  });

  const ligar = useMutation({
    mutationFn: (m: { tipo: "ativo" | "destaque"; id: string; valor: boolean }) =>
      m.tipo === "ativo" ? mudarAtivo("servicos", m.id, m.valor) : mudarDestaque(m.id, m.valor),
    onSuccess: () => {
      setMensagem("");
      setErroGeral(null);
      recarregar();
    },
    onError: (e) => setErroGeral(e.message),
  });

  if (servicos.isPending || categorias.isPending || servicos.isError || categorias.isError) {
    return (
      <Carregando
        module="servicos"
        erro={servicos.isError || categorias.isError}
        aoTentar={() => {
          void servicos.refetch();
          void categorias.refetch();
        }}
      />
    );
  }

  const termo = busca.trim().toLowerCase();
  const itens = servicos.data.filter((s) => s.nome.toLowerCase().includes(termo));

  function enviar() {
    if (!editando) return;
    const { erros: encontrados, dados } = validarServico(editando.form);
    setErros(encontrados);
    setErroGeral(null);
    if (dados) salvar.mutate(editando);
  }

  const colunas: Coluna<ServicoDoDono>[] = [
    {
      rotulo: "Nome",
      principal: true,
      render: (s) => (
        <span className="inline-flex items-center gap-3">
          {s.fotoUrl && <Miniatura url={s.fotoUrl} />}
          <span>
            {s.nome}
            {s.destaque && (
              <Badge variant="info" className="ml-2">
                Mais pedido
              </Badge>
            )}
          </span>
        </span>
      ),
    },
    { rotulo: "Categoria", render: (s) => s.categoria ?? "Sem categoria" },
    {
      rotulo: "Preço",
      alinharADireita: true,
      render: (s) => precoCurtoDeCentavos(s.precoCentavos),
    },
    { rotulo: "Duração", render: (s) => `${s.duracaoMinutos} min` },
    {
      rotulo: "Mais pedido",
      render: (s) => (
        <BotaoDeLigar
          ligado={s.destaque}
          rotulo={`Marcar ${s.nome} como mais pedido`}
          textoLigado="Marcado"
          textoDesligado="Não"
          desabilitado={ligar.isPending}
          aoMudar={() => ligar.mutate({ tipo: "destaque", id: s.id, valor: !s.destaque })}
        />
      ),
    },
    {
      rotulo: "Disponível",
      render: (s) => (
        <BotaoDeLigar
          ligado={s.ativo}
          rotulo={`Alterar disponibilidade de ${s.nome}`}
          textoLigado="Ativo"
          textoDesligado="Inativo"
          desabilitado={ligar.isPending}
          aoMudar={() => ligar.mutate({ tipo: "ativo", id: s.id, valor: !s.ativo })}
        />
      ),
    },
    {
      rotulo: "Editar",
      alinharADireita: true,
      render: (s) => (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Editar ${s.nome}`}
          onClick={() => {
            setMensagem("");
            setErros({});
            setErroGeral(null);
            setEditando({
              id: s.id,
              form: deServico(s),
              fotoAtual: s.fotoUrl,
              foto: semMudancaDeFoto,
            });
          }}
        >
          <Pencil />
        </Button>
      ),
    },
  ];

  const form = editando?.form;
  const mudar = (parte: Partial<FormularioDeServico>) =>
    editando && setEditando({ ...editando, form: { ...editando.form, ...parte } });

  return (
    <PaginaAdmin
      module="servicos"
      message={mensagem}
      onCloseMessage={() => setMensagem("")}
      action={
        <Button
          onClick={() => {
            setMensagem("");
            setErros({});
            setErroGeral(null);
            setEditando({
              id: null,
              form: servicoEmBranco,
              fotoAtual: null,
              foto: semMudancaDeFoto,
            });
          }}
        >
          <Plus />
          Novo serviço
        </Button>
      }
    >
      <Busca valor={busca} aoMudar={setBusca} total={servicos.data.length} />
      {erroGeral && !editando && (
        <p role="alert" className="text-base font-semibold text-destructive">
          {erroGeral}
        </p>
      )}
      <ListaAdaptavel
        descricao="Serviços"
        linhas={itens}
        chave={(s) => s.id}
        vazio={
          <EstadoVazio
            titulo={
              servicos.data.length === 0 ? "Nenhum serviço cadastrado." : "Nenhum item encontrado."
            }
            texto={
              servicos.data.length === 0
                ? "Cadastre o primeiro serviço para ele aparecer no site."
                : "Tente buscar por outro nome."
            }
          />
        }
        colunas={colunas}
      />

      <Cadastro
        aberto={!!editando && !!form}
        titulo={editando?.id ? "Editar serviço" : "Novo serviço"}
        aoFechar={() => setEditando(null)}
      >
        {form && (
          <form
            noValidate
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              enviar();
            }}
          >
            <Campo id="cad-nome" rotulo="Nome" {...(erros.nome ? { erro: erros.nome } : {})}>
              {(props) => (
                <Input
                  {...props}
                  value={form.nome}
                  onChange={(e) => mudar({ nome: e.target.value })}
                />
              )}
            </Campo>
            <Campo id="cad-categoria" rotulo="Categoria">
              {(props) => (
                <NativeSelect
                  {...props}
                  value={form.categoriaId}
                  onChange={(e) => mudar({ categoriaId: e.target.value })}
                >
                  <option value="">Sem categoria</option>
                  {categorias.data.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </Campo>
            <Campo
              id="cad-nova-categoria"
              rotulo="Ou crie uma categoria nova"
              opcional
              {...(erros.novaCategoria ? { erro: erros.novaCategoria } : {})}
            >
              {(props) => (
                <Input
                  {...props}
                  value={form.novaCategoria}
                  onChange={(e) => mudar({ novaCategoria: e.target.value })}
                />
              )}
            </Campo>
            <Campo id="cad-descricao" rotulo="Descrição" opcional>
              {(props) => (
                <Input
                  {...props}
                  value={form.descricao}
                  onChange={(e) => mudar({ descricao: e.target.value })}
                />
              )}
            </Campo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                id="cad-preco"
                rotulo="Preço (R$)"
                {...(erros.preco ? { erro: erros.preco } : {})}
              >
                {(props) => (
                  <Input
                    {...props}
                    inputMode="decimal"
                    placeholder="45,00"
                    value={form.preco}
                    onChange={(e) => mudar({ preco: e.target.value })}
                  />
                )}
              </Campo>
              <Campo
                id="cad-duracao"
                rotulo="Duração (min)"
                {...(erros.duracao ? { erro: erros.duracao } : {})}
              >
                {(props) => (
                  <Input
                    {...props}
                    inputMode="numeric"
                    value={form.duracao}
                    onChange={(e) => mudar({ duracao: e.target.value })}
                  />
                )}
              </Campo>
            </div>
            <Campo
              id="cad-ordem"
              rotulo="Posição na lista"
              ajuda="Número menor aparece primeiro."
              {...(erros.ordem ? { erro: erros.ordem } : {})}
            >
              {(props) => (
                <Input
                  {...props}
                  inputMode="numeric"
                  value={form.ordem}
                  onChange={(e) => mudar({ ordem: e.target.value })}
                />
              )}
            </Campo>
            <CampoDeFoto
              id="cad-foto"
              nomeDoItem={form.nome}
              urlAtual={editando?.fotoAtual ?? null}
              mudanca={editando?.foto ?? semMudancaDeFoto}
              aoMudar={(foto) => editando && setEditando({ ...editando, foto })}
            />
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base font-semibold">
              <input
                type="checkbox"
                checked={form.destaque}
                onChange={(e) => mudar({ destaque: e.target.checked })}
                className="size-6 shrink-0 accent-foreground"
              />
              Marcar como mais pedido
            </label>
            {erroGeral && (
              <p role="alert" className="text-base font-semibold text-destructive">
                {erroGeral}
              </p>
            )}
            <Button type="submit" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando" : "Salvar cadastro"}
            </Button>
          </form>
        )}
      </Cadastro>
    </PaginaAdmin>
  );
}

// ---- Produtos -------------------------------------------------------------------------------

const produtoEmBranco: FormularioDeProduto = { nome: "", descricao: "", preco: "", ordem: "" };

const deProduto = (p: ProdutoDoDono): FormularioDeProduto => ({
  nome: p.nome,
  descricao: p.descricao,
  preco: centavosParaCampo(p.precoCentavos),
  ordem: String(p.ordem),
});

function CatalogoDeProdutos() {
  const queryClient = useQueryClient();
  const produtos = useQuery({ queryKey: chavesDoCatalogo.produtos, queryFn: lerProdutosDoDono });
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<{
    id: string | null;
    form: FormularioDeProduto;
    fotoAtual: string | null;
    foto: MudancaDeFoto;
  } | null>(null);
  const [erros, setErros] = useState<ErrosDoCadastro>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState("");

  const recarregar = () =>
    void queryClient.invalidateQueries({ queryKey: chavesDoCatalogo.produtos });

  const salvar = useMutation({
    mutationFn: (alvo: {
      id: string | null;
      form: FormularioDeProduto;
      fotoAtual: string | null;
      foto: MudancaDeFoto;
    }) => {
      const { dados } = validarProduto(alvo.form);
      if (!dados) throw new Error("Confira os campos.");
      return salvarProduto(alvo.id, dados, { mudanca: alvo.foto, atual: alvo.fotoAtual });
    },
    onSuccess: () => {
      setEditando(null);
      setMensagem("Produto salvo.");
      recarregar();
    },
    onError: (e) => setErroGeral(e.message),
  });

  const ligar = useMutation({
    mutationFn: (m: { id: string; valor: boolean }) => mudarAtivo("produtos", m.id, m.valor),
    onSuccess: () => {
      setMensagem("");
      setErroGeral(null);
      recarregar();
    },
    onError: (e) => setErroGeral(e.message),
  });

  if (produtos.isPending || produtos.isError) {
    return (
      <Carregando
        module="produtos"
        erro={produtos.isError}
        aoTentar={() => void produtos.refetch()}
      />
    );
  }

  const termo = busca.trim().toLowerCase();
  const itens = produtos.data.filter((p) => p.nome.toLowerCase().includes(termo));

  function enviar() {
    if (!editando) return;
    const { erros: encontrados, dados } = validarProduto(editando.form);
    setErros(encontrados);
    setErroGeral(null);
    if (dados) salvar.mutate(editando);
  }

  const form = editando?.form;
  const mudar = (parte: Partial<FormularioDeProduto>) =>
    editando && setEditando({ ...editando, form: { ...editando.form, ...parte } });

  return (
    <PaginaAdmin
      module="produtos"
      message={mensagem}
      onCloseMessage={() => setMensagem("")}
      action={
        <Button
          onClick={() => {
            setMensagem("");
            setErros({});
            setErroGeral(null);
            setEditando({
              id: null,
              form: produtoEmBranco,
              fotoAtual: null,
              foto: semMudancaDeFoto,
            });
          }}
        >
          <Plus />
          Novo produto
        </Button>
      }
    >
      <Busca valor={busca} aoMudar={setBusca} total={produtos.data.length} />
      {erroGeral && !editando && (
        <p role="alert" className="text-base font-semibold text-destructive">
          {erroGeral}
        </p>
      )}
      <ListaAdaptavel
        descricao="Produtos"
        linhas={itens}
        chave={(p) => p.id}
        vazio={
          <EstadoVazio
            titulo={
              produtos.data.length === 0 ? "Nenhum produto cadastrado." : "Nenhum item encontrado."
            }
            texto={
              produtos.data.length === 0
                ? "Cadastre o primeiro produto para ele aparecer na vitrine."
                : "Tente buscar por outro nome."
            }
          />
        }
        colunas={[
          {
            rotulo: "Nome",
            principal: true,
            render: (p) => (
              <span className="inline-flex items-center gap-3">
                {p.fotoUrl && <Miniatura url={p.fotoUrl} />}
                {p.nome}
              </span>
            ),
          },
          { rotulo: "Especificações", render: (p) => p.descricao || "—" },
          {
            rotulo: "Preço",
            alinharADireita: true,
            render: (p) => precoCurtoDeCentavos(p.precoCentavos),
          },
          {
            rotulo: "Disponível",
            render: (p) => (
              <BotaoDeLigar
                ligado={p.ativo}
                rotulo={`Alterar disponibilidade de ${p.nome}`}
                textoLigado="Ativo"
                textoDesligado="Inativo"
                desabilitado={ligar.isPending}
                aoMudar={() => ligar.mutate({ id: p.id, valor: !p.ativo })}
              />
            ),
          },
          {
            rotulo: "Editar",
            alinharADireita: true,
            render: (p) => (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Editar ${p.nome}`}
                onClick={() => {
                  setMensagem("");
                  setErros({});
                  setErroGeral(null);
                  setEditando({
                    id: p.id,
                    form: deProduto(p),
                    fotoAtual: p.fotoUrl,
                    foto: semMudancaDeFoto,
                  });
                }}
              >
                <Pencil />
              </Button>
            ),
          },
        ]}
      />

      <Cadastro
        aberto={!!editando && !!form}
        titulo={editando?.id ? "Editar produto" : "Novo produto"}
        aoFechar={() => setEditando(null)}
      >
        {form && (
          <form
            noValidate
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              enviar();
            }}
          >
            <Campo id="cad-nome" rotulo="Nome" {...(erros.nome ? { erro: erros.nome } : {})}>
              {(props) => (
                <Input
                  {...props}
                  value={form.nome}
                  onChange={(e) => mudar({ nome: e.target.value })}
                />
              )}
            </Campo>
            <Campo id="cad-descricao" rotulo="Especificações" opcional>
              {(props) => (
                <Input
                  {...props}
                  value={form.descricao}
                  onChange={(e) => mudar({ descricao: e.target.value })}
                />
              )}
            </Campo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                id="cad-preco"
                rotulo="Preço (R$)"
                {...(erros.preco ? { erro: erros.preco } : {})}
              >
                {(props) => (
                  <Input
                    {...props}
                    inputMode="decimal"
                    placeholder="25,00"
                    value={form.preco}
                    onChange={(e) => mudar({ preco: e.target.value })}
                  />
                )}
              </Campo>
              <Campo
                id="cad-ordem"
                rotulo="Posição na lista"
                {...(erros.ordem ? { erro: erros.ordem } : {})}
              >
                {(props) => (
                  <Input
                    {...props}
                    inputMode="numeric"
                    value={form.ordem}
                    onChange={(e) => mudar({ ordem: e.target.value })}
                  />
                )}
              </Campo>
            </div>
            <CampoDeFoto
              id="cad-foto"
              nomeDoItem={form.nome}
              urlAtual={editando?.fotoAtual ?? null}
              mudanca={editando?.foto ?? semMudancaDeFoto}
              aoMudar={(foto) => editando && setEditando({ ...editando, foto })}
            />
            {erroGeral && (
              <p role="alert" className="text-base font-semibold text-destructive">
                {erroGeral}
              </p>
            )}
            <Button type="submit" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando" : "Salvar cadastro"}
            </Button>
          </form>
        )}
      </Cadastro>
    </PaginaAdmin>
  );
}
