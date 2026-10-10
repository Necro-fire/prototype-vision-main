import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Menu } from "lucide-react";

import { ContatoDoRodape } from "@/components/contato-do-rodape";
import { EstadoDeFuncionamento, MarcaLink } from "@/components/marca";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { descreverExpediente } from "@/features/agenda/expediente";
import { useFuncionamento } from "@/features/agenda/use-funcionamento";
import { useServicosDoRodape } from "@/features/catalogo/use-servicos-do-rodape";
import { useContato } from "@/features/contato/use-contato";

const links = [
  { to: "/", label: "Início" },
  { to: "/servicos", label: "Serviços" },
  { to: "/produtos", label: "Produtos" },
  { to: "/avaliacoes", label: "Avaliações" },
  { to: "/contato", label: "Contato" },
] as const;

const linkDoMenu =
  "inline-flex min-h-11 items-center border-b-2 border-transparent px-3 text-base font-semibold text-header-muted transition-colors hover:text-header-foreground";

const linkDoRodape =
  "inline-flex min-h-11 items-center text-base text-header-muted transition-colors hover:text-primary";

const tituloDoRodape = "text-base font-semibold text-header-foreground";

export function ShopLayout({ children }: { children: ReactNode }) {
  const { funcionamento, expediente } = useFuncionamento();
  const contato = useContato();
  const servicos = useServicosDoRodape();
  const atendimento = expediente ? descreverExpediente(expediente) : [];
  const temContato = Boolean(
    contato && (contato.endereco || contato.telefone || contato.whatsapp || contato.instagram),
  );
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:font-bold focus:text-primary-foreground"
      >
        Ir para o conteúdo
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-header text-header-foreground">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-3 px-5 py-3 md:grid-cols-[1fr_auto_1fr]">
          <MarcaLink ligado={funcionamento?.aberto ?? false} className="justify-self-start" />

          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                activeOptions={{ exact: link.to === "/" }}
                activeProps={{ className: "!border-primary !text-primary" }}
                className={linkDoMenu}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 justify-self-end">
            <Link
              to="/cliente"
              className="hidden min-h-11 items-center px-3 text-base font-semibold text-header-muted hover:text-header-foreground lg:inline-flex"
            >
              Minha conta
            </Link>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-primary text-primary hover:border-primary hover:bg-primary hover:text-primary-foreground"
            >
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
                        activeOptions={{ exact: link.to === "/" }}
                        activeProps={{ className: "text-primary" }}
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

      <footer className="border-t border-line bg-header text-header-foreground">
        <div className="mx-auto grid max-w-6xl gap-x-8 gap-y-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1.2fr_1.6fr_1.5fr]">
          <div className="grid content-start gap-4 sm:col-span-2 lg:col-span-1">
            <MarcaLink ligado={funcionamento?.aberto ?? false} className="justify-self-start" />
            <p className="max-w-[40ch] text-base text-header-muted">
              Corte, barba e sobrancelha com hora marcada. Um barbeiro, uma agenda e o preço à
              vista.
            </p>
            {funcionamento && (
              <EstadoDeFuncionamento aberto={funcionamento.aberto} texto={funcionamento.texto} />
            )}
          </div>

          <nav aria-label="Rodapé" className="grid content-start gap-1">
            <h2 className={tituloDoRodape}>Navegação</h2>
            <ul className="grid">
              {[...links, { to: "/cliente", label: "Minha conta" } as const].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={linkDoRodape}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {servicos.length > 0 && (
            <nav aria-label="Serviços" className="grid content-start gap-1">
              <h2 className={tituloDoRodape}>Serviços</h2>
              <ul className="grid">
                {servicos.map((s) => (
                  <li key={s.id}>
                    <Link to="/agendamento" search={{ service: s.id }} className={linkDoRodape}>
                      {s.nome}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link to="/servicos" className={linkDoRodape}>
                    Todos os serviços
                  </Link>
                </li>
              </ul>
            </nav>
          )}

          {temContato && (
            <div className="grid content-start gap-1">
              <h2 className={tituloDoRodape}>Contato</h2>
              <ContatoDoRodape contato={contato} />
            </div>
          )}

          <div className="grid content-start gap-3">
            <h2 className={tituloDoRodape}>Horário de atendimento</h2>
            {atendimento.length > 0 && (
              <ul aria-label="Horário de atendimento" className="grid gap-3">
                {atendimento.map((g) => (
                  <li key={g.dias} className="grid text-base">
                    <span className="text-header-foreground first-letter:uppercase">{g.dias}</span>
                    <span className="text-header-muted">{g.horas}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 px-5 py-2">
            <p className="text-sm text-header-muted">© {new Date().getFullYear()} ON-STYLE.</p>
            <Link to="/admin" className={`${linkDoRodape} text-sm`}>
              Área do dono
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
