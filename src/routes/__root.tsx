import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";
import { lerExpediente } from "@/features/agenda/banco";
import { lerServicos } from "@/features/catalogo/banco";
import { lerContato } from "@/features/contato/banco";
import { dadosDeNegocioLocal, jsonParaScript } from "@/features/contato/seo";
import { NOME } from "@/lib/marca";
import { imagemDeCompartilhamento, urlDoSite } from "@/lib/site";
import { ouNulo } from "@/lib/supabase";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-8xl font-semibold text-primary">404</h1>
        <h2 className="mt-2 font-display text-3xl font-semibold text-foreground">
          Não achamos essa página
        </h2>
        <p className="mt-2 text-base text-muted-foreground">
          O endereço pode estar errado ou a página mudou de lugar.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-5 py-2 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/85"
          >
            Ir para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl font-bold text-foreground">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Algo deu errado do nosso lado. Tente de novo ou volte para o início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-md bg-primary px-5 py-2 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/85"
          >
            Tentar de novo
          </button>
          <a
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-input bg-transparent px-5 py-2 text-base font-bold text-foreground transition-colors hover:bg-primary/10"
          >
            Ir para o início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // O funcionamento (o "ON" aceso da marca), o contato e os serviços do rodapé aparecem em todas
  // as páginas, então vêm da raiz. Do serviço só seguem o código e o nome.
  loader: async () => {
    const [expediente, contato, servicos] = await Promise.all([
      ouNulo(lerExpediente()),
      ouNulo(lerContato()),
      ouNulo(lerServicos()),
    ]);
    return {
      expediente,
      contato,
      servicos: servicos?.map((s) => ({ id: s.id, nome: s.nome })) ?? null,
    };
  },
  staleTime: 60_000,
  head: ({ loaderData }) => {
    const site = urlDoSite();
    const negocio = dadosDeNegocioLocal({
      contato: loaderData?.contato ?? null,
      expediente: loaderData?.expediente ?? null,
      urlDoSite: site,
    });
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "theme-color", content: "#0d0f12" },
        { title: `${NOME} — Barbearia` },
        {
          name: "description",
          content:
            "Corte, barba e sobrancelha com hora marcada. Veja os preços e agende em um minuto.",
        },
        { property: "og:title", content: `${NOME} — Barbearia` },
        {
          property: "og:description",
          content: "Veja os preços e marque seu horário na ON-STYLE.",
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: site ? "summary_large_image" : "summary" },
        ...(site
          ? [
              { property: "og:image", content: imagemDeCompartilhamento(site) },
              { property: "og:image:width", content: "1200" },
              { property: "og:image:height", content: "630" },
              { property: "og:image:alt", content: "Cadeira de barbeiro preta em uma sala clara." },
              { name: "twitter:image", content: imagemDeCompartilhamento(site) },
            ]
          : []),
      ],
      scripts: negocio ? [{ type: "application/ld+json", children: jsonParaScript(negocio) }] : [],
      links: [
        {
          rel: "stylesheet",
          href: appCss,
        },
        { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Public+Sans:wght@400..700&display=swap",
        },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
