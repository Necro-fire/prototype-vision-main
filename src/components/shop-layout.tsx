import { Link, useLocation } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ArrowUpRight, Menu, Scissors, X, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/" as const, label: "Início" },
  { to: "/servicos" as const, label: "Serviços" },
  { to: "/produtos" as const, label: "Produtos" },
  { to: "/contato" as const, label: "Contato" },
];
export function Brand() {
  return (
    <Link to="/" className="brand">
      <Scissors />
      <span>
        SLICK<span className="text-primary">.</span>
        <small>BARBEARIA & ESTILO</small>
      </span>
    </Link>
  );
}
export function ShopLayout({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  return (
    <div className="shop">
      <header className="site-header">
        <div className="site-header-inner">
          <Brand />
          <nav className="desktop-nav">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className={location.pathname === l.to ? "active" : ""}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <Link to="/cliente" className="customer-link">
              Minha conta
            </Link>
            <Button asChild className="booking-button">
              <Link to="/agendamento" search={{ service: undefined }}>
                Agendar horário <ArrowUpRight />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="mobile-menu"
              aria-label={menu ? "Fechar menu" : "Abrir menu"}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
        {menu && (
          <nav className="mobile-nav">
            {[...links, { to: "/cliente" as const, label: "Minha conta" }].map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setMenu(false)}>
                {l.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div className="footer-top">
          <Brand />
          <p>Seu estilo. Nosso ofício.</p>
          <Link to="/admin">
            Painel demonstrativo <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Slick Barbearia</span>
          <span>Protótipo · Marca, preços e horários ilustrativos</span>
          <Instagram size={17} />
        </div>
      </footer>
    </div>
  );
}
