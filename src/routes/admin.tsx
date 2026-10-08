import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Scissors,
  Package,
  Users,
  Receipt,
  Wallet,
  Settings,
  ArrowUpRight,
  Menu,
  X,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Brand } from "@/components/shop-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEMO_ADMIN } from "@/features/conta/admin-demo";
import { useShop } from "@/features/demo/shop-provider";
const modules = [
  { id: "agendamentos", label: "Agendamentos", icon: CalendarDays },
  { id: "servicos", label: "Serviços", icon: Scissors },
  { id: "produtos", label: "Produtos", icon: Package },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "vendas", label: "Vendas", icon: Receipt },
  { id: "financeiro", label: "Financeiro", icon: Wallet },
  { id: "configuracoes", label: "Configurações", icon: Settings },
];
export const Route = createFileRoute("/admin")({ component: AdminLayout });
function AdminLogin() {
  const shop = useShop();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phase, setPhase] = useState<"idle" | "checking" | "ok">("idle");
  const [shake, setShake] = useState(false);
  function fillDemo() {
    setEmail(DEMO_ADMIN.email);
    setPassword(DEMO_ADMIN.password);
    setError("");
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (phase !== "idle") return;
    setError("");
    setPhase("checking");
    // Pequena pausa para simular a verificação e deixar o fluxo mais vivo.
    setTimeout(() => {
      if (shop.login(email, password)) {
        setPhase("ok");
      } else {
        setPhase("idle");
        setError("E-mail ou senha inválidos. Tente as credenciais demonstrativas abaixo.");
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    }, 700);
  }
  return (
    <main className="section-wrap appointment-page admin-login-page">
      <Brand />
      <span className="eyebrow">ÁREA ADMINISTRATIVA</span>
      <h1>
        ENTRAR NA <span className="text-primary">GESTÃO.</span>
      </h1>
      <form
        className={`booking-main admin-login-form ${shake ? "shake" : ""} ${phase === "ok" ? "login-success" : ""}`}
        onSubmit={submit}
      >
        <label className="field-label" htmlFor="admin-email">
          E-mail
        </label>
        <Input
          id="admin-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={phase !== "idle"}
        />
        <label className="field-label" htmlFor="admin-pass">
          Senha
        </label>
        <div className="password-field">
          <Input
            id="admin-pass"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={phase !== "idle"}
          />
          <button
            type="button"
            className="password-toggle"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {phase === "ok" ? (
          <p className="login-ok" role="status">
            <CheckCircle2 size={18} /> Acesso liberado. Abrindo o painel…
          </p>
        ) : (
          <Button type="submit" disabled={phase === "checking"}>
            {phase === "checking" ? (
              <>
                Verificando… <Loader2 className="spin" />
              </>
            ) : (
              <>
                Entrar <ArrowUpRight />
              </>
            )}
          </Button>
        )}
        <div className="demo-credentials">
          <p className="demo-note">
            Acesso demonstrativo, separado do acesso de clientes. Em produção, a autorização deve
            ser validada no servidor.
          </p>
          <button
            type="button"
            className="demo-fill"
            onClick={fillDemo}
            disabled={phase !== "idle"}
          >
            <KeyRound size={16} />
            <span>
              <strong>Preencher acesso demo</strong>
              <small>
                {DEMO_ADMIN.email} · {DEMO_ADMIN.password}
              </small>
            </span>
          </button>
        </div>
        <Link to="/" className="text-link">
          Voltar ao site
        </Link>
      </form>
    </main>
  );
}
function AdminLayout() {
  const shop = useShop();
  if (!shop.admin) return <AdminLogin />;
  return <AdminShell />;
}
function AdminShell() {
  const shop = useShop();
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  return (
    <div className="admin-layout">
      <aside className={`admin-sidebar ${menu ? "open" : ""}`}>
        <Brand />
        <div className="admin-workspace">
          <span>S</span>
          <div>
            Slick Barbearia<small>Gestão do negócio</small>
          </div>
        </div>
        <nav>
          <Link
            to="/admin"
            className={location.pathname === "/admin" ? "active" : ""}
            onClick={() => setMenu(false)}
          >
            <LayoutDashboard size={18} />
            Visão geral
          </Link>
          <span className="nav-group-label">GERENCIAR</span>
          {modules.map((m) => (
            <Link
              key={m.id}
              to="/admin/$module"
              params={{ module: m.id }}
              className={location.pathname.endsWith(`/${m.id}`) ? "active" : ""}
              onClick={() => setMenu(false)}
            >
              <m.icon size={18} />
              {m.label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link to="/">
            Ver site público <ArrowUpRight size={16} />
          </Link>
          <div className="admin-profile">
            <span>AD</span>
            <div>
              Administrador<small>Ambiente demonstrativo</small>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={shop.logout}>
            Sair
          </Button>
        </div>
      </aside>
      <div className="admin-body">
        <header className="admin-topbar">
          <Button
            className="admin-menu"
            variant="ghost"
            size="icon"
            aria-label="Menu administrativo"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </Button>
          <span className="demo-indicator" />
          PAINEL DEMONSTRATIVO
          <span className="admin-warning">Dados temporários · sem autenticação real</span>
          <Button asChild variant="outline" size="sm">
            <Link to="/">
              Ver barbearia <ArrowUpRight />
            </Link>
          </Button>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
