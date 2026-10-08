import { useState } from "react";
import { Check, Pencil, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { categories, type Product, type Service } from "@/features/catalogo/tipos";
import { useShop } from "@/features/demo/shop-provider";
import { money } from "@/lib/dinheiro";
import { PaginaAdmin } from "./pagina-admin";

// Serviços e produtos compartilham a mesma tela: muda só a lista e os campos do cadastro.
export function Catalogo({ module }: { module: "servicos" | "produtos" }) {
  const shop = useShop();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Service | Product | null>(null);
  const [message, setMessage] = useState("");
  function save() {
    if (
      !editing ||
      !editing.name.trim() ||
      editing.price < 0 ||
      ("duration" in editing && editing.duration <= 0)
    ) {
      setMessage("Confira nome, preço e duração.");
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
    setMessage("Cadastro salvo nesta sessão.");
  }
  return (
    <PaginaAdmin
      module={module}
      message={message}
      onCloseMessage={() => setMessage("")}
      action={
        <Button
          onClick={() => {
            setMessage("");
            setEditing(
              module === "servicos"
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
          }}
        >
          <Plus />
          {module === "servicos" ? "Novo serviço" : "Novo produto"}
        </Button>
      }
    >
      <div className="admin-filter-bar">
        <div className="search-input">
          <Search size={17} />
          <Input
            aria-label="Pesquisar catálogo"
            placeholder="Buscar no catálogo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <span>
          {(module === "servicos" ? shop.services : shop.products).length} itens cadastrados
        </span>
      </div>
      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>{module === "servicos" ? "Categoria" : "Especificações"}</th>
              <th>Preço</th>
              {module === "servicos" && <th>Duração</th>}
              <th>Disponível</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(module === "servicos" ? shop.services : shop.products)
              .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
              .map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong>
                  </td>
                  <td>{"category" in s ? String(s.category) : s.description}</td>
                  <td>{money(s.price)}</td>
                  {"duration" in s && <td>{String(s.duration)} min</td>}
                  <td>
                    <Button
                      variant="ghost"
                      className={`active-toggle ${s.active ? "enabled" : ""}`}
                      aria-label={`Alterar disponibilidade de ${s.name}`}
                      onClick={() => {
                        if (module === "servicos")
                          shop.setServices((old) =>
                            old.map((item) =>
                              item.id === s.id ? { ...item, active: !item.active } : item,
                            ),
                          );
                        else
                          shop.setProducts((old) =>
                            old.map((item) =>
                              item.id === s.id ? { ...item, active: !item.active } : item,
                            ),
                          );
                      }}
                    >
                      <span />
                      {s.active ? "Ativo" : "Inativo"}
                    </Button>
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Editar ${s.name}`}
                      onClick={() => {
                        setMessage("");
                        setEditing({ ...s });
                      }}
                    >
                      <Pencil size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
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
              <label className="field-label">
                Nome
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </label>
              {"category" in editing && (
                <label className="field-label">
                  Categoria
                  <select
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
                  </select>
                </label>
              )}
              <label className="field-label">
                Descrição
                <Input
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </label>
              <div className="form-columns">
                <label className="field-label">
                  Preço (R$)
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editing.price}
                    onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                  />
                </label>
                {"duration" in editing && (
                  <label className="field-label">
                    Duração (min)
                    <Input
                      type="number"
                      min="15"
                      step="15"
                      value={editing.duration}
                      onChange={(e) => {
                        if ("duration" in editing)
                          setEditing({ ...editing, duration: Number(e.target.value) });
                      }}
                    />
                  </label>
                )}
              </div>
              {message && <p className="form-error">{message}</p>}
              <Button onClick={save}>
                Salvar cadastro <Check />
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PaginaAdmin>
  );
}
