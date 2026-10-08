import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  CalendarDays,
  Plus,
  Pencil,
  Search,
  Package,
  Scissors,
  TrendingUp,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  useShop,
  money,
  categories,
  today,
  type Service,
  type Product,
  grossRevenue,
} from "@/lib/barbershop";
export const moduleNames: Record<string, string> = {
  dashboard: "Visão geral",
  agendamentos: "Agendamentos",
  servicos: "Serviços",
  produtos: "Produtos",
  clientes: "Clientes",
  vendas: "Vendas",
  financeiro: "Financeiro",
  configuracoes: "Configurações",
};
const statuses = [
  "Agendado",
  "Confirmado",
  "Em atendimento",
  "Concluído",
  "Cancelado",
  "Não compareceu",
];
export function AdminPanel({ module = "dashboard" }: { module?: string }) {
  const shop = useShop();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Todos");
  const [period, setPeriod] = useState("");
  const [editing, setEditing] = useState<Service | Product | null>(null);
  const [message, setMessage] = useState("");
  const [hours, setHours] = useState(shop.hours);
  const completed = shop.bookings.filter(
    (b) => b.status === "Concluído" && (!period || b.date === period),
  );
  const revenue = grossRevenue(shop.bookings, shop.sales, { date: period }).total;
  const sorted = [...shop.bookings].sort((a, b) =>
    `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
  );
  const filtered = sorted.filter(
    (b) =>
      (status === "Todos" || b.status === status) &&
      (!period || b.date === period) &&
      `${b.name} ${b.serviceName} ${b.phone}`.toLowerCase().includes(query.toLowerCase()),
  );
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
  const table = (rows = filtered) => (
    <div className="table-scroll">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Serviço</th>
            <th>Data / horário</th>
            <th>Valor</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id}>
              <td>
                <strong>{b.name}</strong>
                <small>{b.phone}</small>
              </td>
              <td>{b.serviceName}</td>
              <td>
                {new Date(`${b.date}T12:00:00`).toLocaleDateString("pt-BR")}
                <small>{b.time}</small>
              </td>
              <td>{money(b.price)}</td>
              <td>
                <select
                  aria-label={`Status de ${b.name}`}
                  className="status-select"
                  value={b.status}
                  onChange={(e) =>
                    shop.setBookings((old) =>
                      old.map((item) =>
                        item.id === b.id ? { ...item, status: e.target.value } : item,
                      ),
                    )
                  }
                >
                  {statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="admin-empty">
          <CalendarDays />
          <h3>Nenhum registro por aqui.</h3>
          <p>Os agendamentos feitos no site aparecem nesta sessão.</p>
          <Button asChild variant="outline">
            <Link to="/agendamento" search={{ service: undefined }}>
              Criar um agendamento <ArrowUpRight />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">SLICK / GESTÃO</span>
          <h1>{moduleNames[module] ?? "Página não encontrada"}</h1>
          <p>
            {module === "dashboard"
              ? "O que importa para o seu negócio, em um só lugar."
              : module === "configuracoes"
                ? "Os detalhes que fazem a barbearia funcionar."
                : "Organize o seu ofício."}
          </p>
        </div>
        {["servicos", "produtos"].includes(module) ? (
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
        ) : (
          <span className="admin-date">
            {new Date().toLocaleDateString("pt-BR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        )}
      </div>
      {message && (
        <div role="status" className="admin-notice">
          <Check size={16} />
          {message}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Fechar aviso"
            onClick={() => setMessage("")}
          >
            <X />
          </Button>
        </div>
      )}
      {module === "dashboard" && (
        <>
          <div className="stats-grid">
            <div className="stat">
              <span>
                Faturamento bruto <TrendingUp />
              </span>
              <strong>{money(revenue)}</strong>
              <small>Atendimentos concluídos nesta sessão</small>
            </div>
            <div className="stat">
              <span>
                Agendamentos <CalendarDays />
              </span>
              <strong>
                {shop.bookings
                  .filter((b) => !["Cancelado", "Não compareceu"].includes(b.status))
                  .length.toString()
                  .padStart(2, "0")}
              </strong>
              <small>{shop.bookings.filter((b) => b.date === today()).length} para hoje</small>
            </div>
            <div className="stat">
              <span>
                Clientes <Scissors />
              </span>
              <strong>{shop.clients.length.toString().padStart(2, "0")}</strong>
              <small>Cadastros únicos por celular</small>
            </div>
            <div className="stat">
              <span>
                Ticket médio <Package />
              </span>
              <strong>{money(completed.length ? revenue / completed.length : 0)}</strong>
              <small>Por atendimento concluído</small>
            </div>
          </div>
          <div className="admin-section-head">
            <h2>Próximos agendamentos</h2>
            <Link to="/admin/$module" params={{ module: "agendamentos" }} className="text-link">
              Ver todos <ArrowUpRight size={16} />
            </Link>
          </div>
          {table(
            sorted
              .filter((b) => ["Agendado", "Confirmado", "Em atendimento"].includes(b.status))
              .slice(0, 5),
          )}
          <div className="admin-section-head">
            <h2>Serviços mais vendidos</h2>
            <span className="text-muted-foreground text-sm">Atendimentos concluídos</span>
          </div>
          <div className="ranking">
            {shop.services
              .map((s) => ({
                name: s.name,
                count: completed.filter((b) => b.serviceId === s.id).length,
              }))
              .filter((s) => s.count > 0)
              .sort((a, b) => b.count - a.count)
              .map((s, i) => (
                <div key={s.name}>
                  <span>0{i + 1}</span>
                  <strong>{s.name}</strong>
                  <span>{s.count} atendimentos</span>
                </div>
              ))}
            {completed.length === 0 && (
              <p className="text-muted-foreground">
                O ranking aparecerá quando houver atendimentos concluídos.
              </p>
            )}
          </div>
        </>
      )}
      {module === "agendamentos" && (
        <>
          <div className="admin-filter-bar">
            <div className="search-input">
              <Search size={17} />
              <Input
                aria-label="Pesquisar registros"
                placeholder="Buscar cliente ou serviço..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Input
              type="date"
              aria-label="Filtrar por data"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
            {module === "agendamentos" && (
              <select
                aria-label="Filtrar status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option>Todos</option>
                {statuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                setQuery("");
                setPeriod("");
                setStatus("Todos");
              }}
            >
              Limpar
            </Button>
          </div>
          {table(filtered)}
        </>
      )}
      {["servicos", "produtos"].includes(module) && (
        <>
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
        </>
      )}
      {module === "vendas" && <SalesModule />}
      {module === "financeiro" && <FinanceModule />}
      {module === "clientes" && (
        <>
          <div className="admin-filter-bar">
            <div className="search-input">
              <Search size={17} />
              <Input
                aria-label="Buscar cliente"
                placeholder="Buscar por nome ou celular..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Celular</th>
                  <th>Agendamentos</th>
                </tr>
              </thead>
              <tbody>
                {shop.clients
                  .filter((c) => `${c.name} ${c.phone}`.toLowerCase().includes(query.toLowerCase()))
                  .map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.phone}</td>
                      <td>{shop.bookings.filter((b) => b.clientId === c.id).length}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {shop.clients.length === 0 && (
              <div className="admin-empty">
                <h3>Nenhum cliente cadastrado.</h3>
                <p>O primeiro agendamento cria o cadastro por celular.</p>
              </div>
            )}
          </div>
        </>
      )}
      {module === "configuracoes" && (
        <div className="settings-layout">
          <section>
            <h2>Horário de funcionamento</h2>
            <p>A disponibilidade da agenda acompanha estes horários.</p>
            <div className="settings-time">
              <label>
                Abertura
                <select
                  value={hours.open}
                  onChange={(e) => setHours({ ...hours, open: Number(e.target.value) })}
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option value={h} key={h}>
                      {String(h).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Fechamento
                <select
                  value={hours.close}
                  onChange={(e) => setHours({ ...hours, close: Number(e.target.value) })}
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option value={h + 1} key={h}>
                      {String(h + 1).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="field-label">Dias de atendimento</label>
            <div className="days-selector">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, i) => (
                <Button
                  key={d}
                  variant="outline"
                  className={hours.days.includes(i) ? "selected" : ""}
                  onClick={() =>
                    setHours({
                      ...hours,
                      days: hours.days.includes(i)
                        ? hours.days.filter((day) => day !== i)
                        : [...hours.days, i].sort(),
                    })
                  }
                >
                  {d}
                </Button>
              ))}
            </div>
            <Button
              onClick={() => {
                if (hours.close <= hours.open) {
                  setMessage("O fechamento deve ser depois da abertura.");
                  return;
                }
                shop.setHours(hours);
                setMessage("Horários atualizados nesta sessão.");
              }}
            >
              Salvar horários <Check />
            </Button>
          </section>
          <section>
            <h2>Perfil da empresa</h2>
            <div className="review-row">
              <span>Nome</span>
              <strong>Slick Barbearia</strong>
            </div>
            <div className="review-row">
              <span>Contato</span>
              <strong>A definir</strong>
            </div>
            <p className="demo-note">
              Marca e horários de demonstração. Cadastro, recuperação de senha e permissões reais
              não estão conectados.
            </p>
            <h2>Suporte</h2>
            <p>Os canais de suporte serão definidos pela empresa.</p>
          </section>
        </div>
      )}
      {!moduleNames[module] && (
        <div className="admin-empty">
          <h2>Módulo não encontrado.</h2>
          <Button asChild>
            <Link to="/admin">Voltar à visão geral</Link>
          </Button>
        </div>
      )}
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
    </>
  );
}
function SalesModule() {
  const shop = useShop();
  const active = shop.products.filter((p) => p.active);
  const [productId, setProductId] = useState(active[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [date, setDate] = useState(today());
  const [period, setPeriod] = useState("");
  const [msg, setMsg] = useState("");
  const sales = shop.sales.filter((v) => !period || v.date === period);
  const services = shop.bookings.filter(
    (b) => b.status === "Concluído" && (!period || b.date === period),
  );
  return (
    <>
      <section className="settings-layout">
        <section>
          <h2>Registrar venda de produto</h2>
          <div className="form-columns">
            <label className="field-label">
              Produto
              <select value={productId} onChange={(e) => setProductId(e.target.value)}>
                {active.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {money(p.price)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Quantidade
              <Input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
              />
            </label>
            <label className="field-label">
              Data
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
          </div>
          {msg && (
            <p role="status" className="returning-client">
              {msg}
            </p>
          )}
          <Button
            onClick={() => {
              try {
                shop.sell(productId, qty, date);
                setQty(1);
                setMsg("Venda registrada nesta sessão.");
              } catch (e) {
                setMsg(e instanceof Error ? e.message : "Erro ao registrar.");
              }
            }}
          >
            Registrar venda <Plus />
          </Button>
        </section>
      </section>
      <div className="admin-filter-bar">
        <Input
          type="date"
          aria-label="Filtrar vendas por data"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        />
        <Button variant="ghost" onClick={() => setPeriod("")}>
          Limpar
        </Button>
      </div>
      <div className="admin-section-head">
        <h2>Histórico de vendas</h2>
      </div>
      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Qtd.</th>
              <th>Data</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((v) => (
              <tr key={v.id}>
                <td>
                  <strong>{v.productName}</strong>
                </td>
                <td>{v.quantity}</td>
                <td>{new Date(`${v.date}T12:00:00`).toLocaleDateString("pt-BR")}</td>
                <td>{money(v.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sales.length === 0 && (
          <div className="admin-empty">
            <h3>Nenhuma venda registrada.</h3>
          </div>
        )}
      </div>
      <div className="admin-section-head">
        <h2>Histórico de serviços</h2>
        <span className="text-muted-foreground text-sm">Atendimentos concluídos</span>
      </div>
      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Serviço</th>
              <th>Data</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {services.map((b) => (
              <tr key={b.id}>
                <td>
                  <strong>{b.name}</strong>
                </td>
                <td>{b.serviceName}</td>
                <td>{new Date(`${b.date}T12:00:00`).toLocaleDateString("pt-BR")}</td>
                <td>{money(b.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {services.length === 0 && (
          <div className="admin-empty">
            <h3>Nenhum serviço concluído.</h3>
            <p>Marque agendamentos como Concluído para vê-los aqui.</p>
          </div>
        )}
      </div>
    </>
  );
}
function FinanceModule() {
  const shop = useShop();
  const [date, setDate] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [productId, setProductId] = useState("");
  const r = grossRevenue(shop.bookings, shop.sales, { date, serviceId, productId });
  return (
    <>
      <div className="admin-filter-bar">
        <Input
          type="date"
          aria-label="Filtrar por data"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <select
          aria-label="Filtrar serviço"
          value={serviceId}
          onChange={(e) => {
            setServiceId(e.target.value);
            setProductId("");
          }}
        >
          <option value="">Todos os serviços</option>
          {shop.services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar produto"
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
            setServiceId("");
          }}
        >
          <option value="">Todos os produtos</option>
          {shop.products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Button
          variant="ghost"
          onClick={() => {
            setDate("");
            setServiceId("");
            setProductId("");
          }}
        >
          Limpar
        </Button>
      </div>
      <div className="stats-grid financial-stats">
        <div className="stat">
          <span>
            Faturamento bruto <TrendingUp />
          </span>
          <strong>{money(r.total)}</strong>
          <small>Serviços concluídos + vendas</small>
        </div>
        <div className="stat">
          <span>
            Serviços <Scissors />
          </span>
          <strong>{money(r.services)}</strong>
          <small>Atendimentos concluídos</small>
        </div>
        <div className="stat">
          <span>
            Produtos <Package />
          </span>
          <strong>{money(r.products)}</strong>
          <small>Vendas registradas</small>
        </div>
      </div>
      <p className="demo-note">
        Outros indicadores (líquido, descontos, formas de pagamento) serão avaliados conforme
        necessidade.
      </p>
    </>
  );
}
