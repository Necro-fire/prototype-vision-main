import { useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { categories, type Product, type Service } from "@/features/catalogo/tipos";
import { useShop } from "@/features/demo/shop-provider";
import { precoCurto } from "@/lib/dinheiro";
import { BarraDeFiltros, EstadoVazio } from "./componentes";
import { ListaAdaptavel, type Coluna } from "./lista-adaptavel";
import { PaginaAdmin } from "./pagina-admin";

type Item = Service | Product;

// Serviços e produtos compartilham a mesma tela: muda só a lista e os campos do cadastro.
export function Catalogo({ module }: { module: "servicos" | "produtos" }) {
  const shop = useShop();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);
  const [message, setMessage] = useState("");
  const [erro, setErro] = useState("");
  const ehServico = module === "servicos";
  const itens: Item[] = ehServico ? shop.services : shop.products;

  function alternarAtivo(id: string) {
    if (ehServico)
      shop.setServices((old) =>
        old.map((item) => (item.id === id ? { ...item, active: !item.active } : item)),
      );
    else
      shop.setProducts((old) =>
        old.map((item) => (item.id === id ? { ...item, active: !item.active } : item)),
      );
  }

  function salvar() {
    if (
      !editing ||
      !editing.name.trim() ||
      editing.price < 0 ||
      ("duration" in editing && editing.duration <= 0)
    ) {
      setErro("Confira nome, preço e duração.");
      return;
    }
    if ("duration" in editing)
      shop.setServices((old) =>
        old.some((s) => s.id === editing.id)
          ? old.map((s) => (s.id === editing.id ? editing : s))
          : [...old, editing],
      );
    else
      shop.setProducts((old) =>
        old.some((p) => p.id === editing.id)
          ? old.map((p) => (p.id === editing.id ? editing : p))
          : [...old, editing],
      );
    setEditing(null);
    setErro("");
    setMessage("Cadastro salvo nesta sessão.");
  }

  function novo() {
    setMessage("");
    setErro("");
    setEditing(
      ehServico
        ? {
            id: crypto.randomUUID(),
            name: "",
            category: "Cortes",
            description: "",
            price: 0,
            duration: 30,
            active: true,
          }
        : { id: crypto.randomUUID(), name: "", description: "", price: 0, active: true },
    );
  }

  const colunas: Coluna<Item>[] = [
    { rotulo: "Nome", principal: true, render: (s) => s.name },
    {
      rotulo: ehServico ? "Categoria" : "Especificações",
      render: (s) => ("category" in s ? s.category : s.description),
    },
    { rotulo: "Preço", alinharADireita: true, render: (s) => precoCurto(s.price) },
    ...(ehServico
      ? [
          {
            rotulo: "Duração",
            render: (s: Item) => ("duration" in s ? `${s.duration} min` : ""),
          },
        ]
      : []),
    {
      rotulo: "Disponível",
      render: (s) => (
        <Button
          variant={s.active ? "outline" : "ghost"}
          size="sm"
          aria-pressed={s.active}
          aria-label={`Alterar disponibilidade de ${s.name}`}
          onClick={() => alternarAtivo(s.id)}
        >
          <span
            aria-hidden="true"
            className={`size-2.5 rounded-full ${s.active ? "bg-success" : "bg-muted-foreground"}`}
          />
          {s.active ? "Ativo" : "Inativo"}
        </Button>
      ),
    },
    {
      rotulo: "Editar",
      alinharADireita: true,
      render: (s) => (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Editar ${s.name}`}
          onClick={() => {
            setMessage("");
            setErro("");
            setEditing({ ...s });
          }}
        >
          <Pencil />
        </Button>
      ),
    },
  ];

  return (
    <PaginaAdmin
      module={module}
      message={message}
      onCloseMessage={() => setMessage("")}
      action={
        <Button onClick={novo}>
          <Plus />
          {ehServico ? "Novo serviço" : "Novo produto"}
        </Button>
      }
    >
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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <p className="text-base text-muted-foreground sm:ml-auto">
          {itens.length} itens cadastrados
        </p>
      </BarraDeFiltros>

      <ListaAdaptavel
        descricao={ehServico ? "Serviços" : "Produtos"}
        linhas={itens.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))}
        chave={(s) => s.id}
        vazio={
          <EstadoVazio titulo="Nenhum item encontrado." texto="Tente buscar por outro nome." />
        }
        colunas={colunas}
      />

      <Dialog
        open={!!editing}
        onOpenChange={(aberto) => {
          if (!aberto) setEditing(null);
        }}
      >
        <DialogContent>
          {editing && (
            <>
              <DialogTitle>
                {"duration" in editing ? "Cadastro de serviço" : "Cadastro de produto"}
              </DialogTitle>
              <DialogDescription>
                As alterações aparecem também no catálogo público desta sessão.
              </DialogDescription>
              <Campo id="cad-nome" rotulo="Nome">
                {(props) => (
                  <Input
                    {...props}
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  />
                )}
              </Campo>
              {"category" in editing && (
                <Campo id="cad-categoria" rotulo="Categoria">
                  {(props) => (
                    <NativeSelect
                      {...props}
                      value={editing.category}
                      onChange={(e) => {
                        if ("category" in editing)
                          setEditing({ ...editing, category: e.target.value });
                      }}
                    >
                      {categories
                        .filter((c) => c !== "Todos")
                        .map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                    </NativeSelect>
                  )}
                </Campo>
              )}
              <Campo id="cad-descricao" rotulo="Descrição">
                {(props) => (
                  <Input
                    {...props}
                    value={editing.description}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  />
                )}
              </Campo>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo id="cad-preco" rotulo="Preço (R$)">
                  {(props) => (
                    <Input
                      {...props}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={editing.price}
                      onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                    />
                  )}
                </Campo>
                {"duration" in editing && (
                  <Campo id="cad-duracao" rotulo="Duração (min)">
                    {(props) => (
                      <Input
                        {...props}
                        type="number"
                        inputMode="numeric"
                        min="15"
                        step="15"
                        value={editing.duration}
                        onChange={(e) => {
                          if ("duration" in editing)
                            setEditing({ ...editing, duration: Number(e.target.value) });
                        }}
                      />
                    )}
                  </Campo>
                )}
              </div>
              {erro && (
                <p role="alert" className="text-base font-semibold text-destructive">
                  {erro}
                </p>
              )}
              <Button onClick={salvar}>Salvar cadastro</Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PaginaAdmin>
  );
}
