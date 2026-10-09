import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Menu } from "lucide-react";

import { ContatoDoRodape } from "@/components/contato-do-rodape";
import { MarcaLink } from "@/components/marca";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useFuncionamento } from "@/features/agenda/use-funcionamento";
import { useContato } from "@/features/contato/use-contato";

const links = [
  { to: "/", label: "Início" },
  { to: "/servicos", label: "Serviços" },
  { to: "/produtos", label: "Produtos" },
  { to: "/avaliacoes", label: "Avaliações" },
  { to: "/contato", label: "Contato" },
] as const;

const linkDoMenu =
  "inline-flex min-h-11 items-center border-b-4 border-transparent px-3 text-base font-semibold text-header-muted transition-colors hover:text-header-foreground";

export function ShopLayout({ children }: { children: ReactNode }) {
  const { funcionamento } = useFuncionamento();
  const contato = useContato();
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:font-bold focus:text-primary-foreground"
      >
        Ir para o conteúdo
      </a>

      <header className="on-dark bg-header text-header-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-2">
          <MarcaLink ligado={funcionamento?.aberto ?? false} />

          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                activeOptions={{ exact: link.to === "/" }}
                activeProps={{ className: "!border-primary !text-header-foreground" }}
                className={linkDoMenu}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <Link
              to="/cliente"
              className="hidden min-h-11 items-center px-3 text-base font-semibold text-header-muted hover:text-header-foreground md:inline-flex"
            >
              Minha conta
            </Link>
            <Button asChild size="sm">
              <Link to="/agendamento" search={{ service: undefined }} aria-label="Agendar horário">
                <span className="hidden sm:inline">Agendar horário</span>
                <span className="sm:hidden">Agendar</span>
              </Link>
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
                  <Menu className="text-header-foreground" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-4/5 max-w-xs">
                <SheetTitle className="mb-4">Menu</SheetTitle>
                <nav aria-label="Menu" className="grid">
                  {[...links, { to: "/cliente", label: "Minha conta" } as const].map((link) => (
                    <SheetClose key={link.to} asChild>
                      <Link
                        to={link.to}
                        className="flex min-h-12 items-center border-b border-border text-lg font-semibold"
                      >
                        {link.label}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main id="conteudo" className="flex-1">
        {children}
      </main>

      <footer className="on-dark bg-header text-header-foreground">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-10 md:grid-cols-[1fr_auto] md:items-start">
          <div className="grid gap-4">
            <MarcaLink ligado={funcionamento?.aberto ?? false} />
            <p className="max-w-[40ch] text-base text-header-muted">
              Corte, barba e sobrancelha com hora marcada.
            </p>
            <ContatoDoRodape contato={contato} />
          </div>
          <nav aria-label="Rodapé" className="-mx-3 flex flex-wrap gap-x-1 gap-y-0">
            {links.map((link) => (
              <Link key={link.to} to={link.to} className={linkDoMenu}>
                {link.label}
              </Link>
            ))}
            <Link to="/cliente" className={linkDoMenu}>
              Minha conta
            </Link>
            <Link to="/admin" className={linkDoMenu}>
              Área do dono
            </Link>
          </nav>
        </div>
        <div className="border-t border-white/15">
          <p className="mx-auto max-w-6xl px-5 py-4 text-sm text-header-muted">
            © {new Date().getFullYear()} ON-STYLE.
          </p>
        </div>
      </footer>
    </div>
  );
}
