import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import {
  CalendarDays,
  Eye,
  EyeOff,
  KeyRound,
  LayoutDashboard,
  type LucideIcon,
  MoreHorizontal,
  Package,
  Receipt,
  Scissors,
  Settings,
  Users,
  Wallet,
} from "lucide-react";

import { MarcaLink } from "@/components/marca";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Input } from "@/components/ui/input";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DEMO_ADMIN } from "@/features/conta/admin-demo";
import { useShop } from "@/features/demo/shop-provider";
import { cn } from "@/lib/utils";

type ItemDoMenu = { id: string; label: string; icone: LucideIcon };

const visaoGeral: ItemDoMenu = { id: "dashboard", label: "Visão geral", icone: LayoutDashboard };
const modulos: ItemDoMenu[] = [
  { id: "agendamentos", label: "Agendamentos", icone: CalendarDays },
  { id: "servicos", label: "Serviços", icone: Scissors },
  { id: "produtos", label: "Produtos", icone: Package },
  { id: "clientes", label: "Clientes", icone: Users },
  { id: "vendas", label: "Vendas", icone: Receipt },
  { id: "financeiro", label: "Financeiro", icone: Wallet },
  { id: "configuracoes", label: "Configurações", icone: Settings },
];
// Os três que o dono mais usa ficam na barra inferior do celular; o resto fica em "Mais".
const principaisNoCelular = ["dashboard", "agendamentos", "vendas"];

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
});

function AdminLogin() {
  const shop = useShop();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!shop.login(email, password)) {
      setError("E-mail ou senha incorretos. Confira os dados e tente de novo.");
    }
  }

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-md content-center gap-6 px-5 py-10">
      <MarcaLink />
      <h1 className="font-display text-4xl font-extrabold leading-tight">Entrar na gestão</h1>
      <form onSubmit={submit} noValidate className="grid gap-5">
        <Campo id="admin-email" rotulo="E-mail">
          {(props) => (
            <Input
              {...props}
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Campo>
        <Campo id="admin-senha" rotulo="Senha" {...(error ? { erro: error } : {})}>
          {(props) => (
            <div className="relative">
              <Input
                {...props}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="pr-14"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0.5 top-0.5"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </Button>
            </div>
          )}
        </Campo>
        <Button type="submit" size="lg">
          Entrar
        </Button>
      </form>

      <div className="grid gap-3 rounded-md border-2 border-dashed border-input p-4">
        <p className="text-sm text-muted-foreground">
          Acesso de demonstração. O login real, com e-mail e senha de verdade, chega com o banco de
          dados.
        </p>
        <Button
          type="button"
          variant="outline"
          className="h-auto justify-start py-3 text-left"
          onClick={() => {
            setEmail(DEMO_ADMIN.email);
            setPassword(DEMO_ADMIN.password);
            setError("");
          }}
        >
          <KeyRound />
          <span className="grid">
            <span>Preencher acesso de demonstração</span>
            <span className="text-sm font-normal text-muted-foreground">
              {DEMO_ADMIN.email}, senha {DEMO_ADMIN.password}
            </span>
          </span>
        </Button>
      </div>
      <Link
        to="/"
        className="inline-flex min-h-11 items-center font-semibold text-info underline underline-offset-4 hover:no-underline"
      >
        Voltar ao site
      </Link>
    </main>
  );
}

function AdminLayout() {
  const shop = useShop();
  if (!shop.admin) return <AdminLogin />;
  return <AdminShell />;
}

function Item({
  item,
  ativo,
  onClick,
}: {
  item: ItemDoMenu;
  ativo: boolean;
  onClick?: () => void;
}) {
  const Icone = item.icone;
  const classe = cn(
    "flex min-h-11 items-center gap-3 rounded-md border-l-4 px-3 text-base font-semibold transition-colors",
    ativo
      ? "border-primary bg-white/10 text-header-foreground"
      : "border-transparent text-header-muted hover:bg-white/5 hover:text-header-foreground",
  );
  const conteudo = (
    <>
      <Icone aria-hidden="true" className="size-5 shrink-0" />
      {item.label}
    </>
  );
  return item.id === "dashboard" ? (
    <Link
      to="/admin"
      className={classe}
      aria-current={ativo ? "page" : undefined}
      onClick={onClick}
    >
      {conteudo}
    </Link>
  ) : (
    <Link
      to="/admin/$module"
      params={{ module: item.id }}
      className={classe}
      aria-current={ativo ? "page" : undefined}
      onClick={onClick}
    >
      {conteudo}
    </Link>
  );
}

function AdminShell() {
  const shop = useShop();
  const { pathname } = useLocation();
  const atual =
    pathname === "/admin" || pathname === "/admin/" ? "dashboard" : pathname.split("/").pop();
  const todos = [visaoGeral, ...modulos];
  const barra = todos.filter((m) => principaisNoCelular.includes(m.id));
  const restantes = todos.filter((m) => !principaisNoCelular.includes(m.id));
  const emMais = restantes.some((m) => m.id === atual);

  return (
    <div className="min-h-dvh md:flex">
      <a
        href="#conteudo-admin"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:font-bold focus:text-primary-foreground"
      >
        Ir para o conteúdo
      </a>

      {/* Computador: menu lateral */}
      <aside className="on-dark sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 bg-header p-4 text-header-foreground md:flex">
        <div className="px-1 pt-1">
          <MarcaLink />
        </div>
        <nav aria-label="Gestão" className="grid gap-1">
          {todos.map((m) => (
            <Item key={m.id} item={m} ativo={atual === m.id} />
          ))}
        </nav>
        <div className="mt-auto grid gap-2 border-t border-white/15 pt-4">
          <Link
            to="/"
            className="flex min-h-11 items-center px-3 text-base font-semibold text-header-muted hover:text-header-foreground"
          >
            Ver o site
          </Link>
          <p className="px-3 text-sm text-header-muted">Dono. Ambiente de demonstração.</p>
          <Button
            variant="outline"
            className="border-white/40 bg-transparent text-header-foreground hover:bg-white/10"
            onClick={shop.logout}
          >
            Sair
          </Button>
        </div>
      </aside>

      {/* Celular: faixa no alto */}
      <header className="on-dark sticky top-0 z-30 flex items-center justify-between bg-header px-5 py-2 text-header-foreground md:hidden">
        <MarcaLink />
        <Link
          to="/"
          className="inline-flex min-h-11 items-center px-2 text-base font-semibold text-header-muted"
        >
          Ver o site
        </Link>
      </header>

      <div className="min-w-0 flex-1">
        <main
          id="conteudo-admin"
          className="mx-auto grid w-full max-w-5xl gap-6 px-5 pb-28 pt-6 md:pb-12 md:pt-10"
        >
          <p className="rounded-md bg-info-soft px-4 py-2.5 text-sm font-semibold text-info">
            Ambiente de demonstração: os dados são temporários e o login não é real.
          </p>
          <Outlet />
        </main>
      </div>

      {/* Celular: barra inferior */}
      <nav
        aria-label="Gestão"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t-2 border-foreground bg-card md:hidden"
      >
        {barra.map((m) => {
          const Icone = m.icone;
          const ativo = atual === m.id;
          const classe = cn(
            "flex min-h-16 flex-col items-center justify-center gap-0.5 border-t-4 text-sm font-semibold",
            ativo ? "border-primary text-foreground" : "border-transparent text-muted-foreground",
          );
          const interno = (
            <>
              <Icone aria-hidden="true" className="size-6" />
              {m.id === "dashboard" ? "Hoje" : m.label}
            </>
          );
          return m.id === "dashboard" ? (
            <Link
              key={m.id}
              to="/admin"
              className={classe}
              aria-current={ativo ? "page" : undefined}
            >
              {interno}
            </Link>
          ) : (
            <Link
              key={m.id}
              to="/admin/$module"
              params={{ module: m.id }}
              className={classe}
              aria-current={ativo ? "page" : undefined}
            >
              {interno}
            </Link>
          );
        })}
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex min-h-16 cursor-pointer flex-col items-center justify-center gap-0.5 border-t-4 text-sm font-semibold",
                emMais
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground",
              )}
            >
              <MoreHorizontal aria-hidden="true" className="size-6" />
              Mais
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-lg">
            <SheetTitle className="mb-3">Mais opções</SheetTitle>
            <nav aria-label="Mais opções" className="grid">
              {restantes.map((m) => (
                <SheetClose key={m.id} asChild>
                  <Link
                    to="/admin/$module"
                    params={{ module: m.id }}
                    className="flex min-h-12 items-center gap-3 border-b border-border text-lg font-semibold"
                  >
                    <m.icone aria-hidden="true" className="size-5" />
                    {m.label}
                  </Link>
                </SheetClose>
              ))}
              <button
                type="button"
                onClick={shop.logout}
                className="flex min-h-12 cursor-pointer items-center gap-3 text-left text-lg font-semibold text-destructive"
              >
                Sair
              </button>
            </nav>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}
