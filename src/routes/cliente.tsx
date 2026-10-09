import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { obterSessao } from "@/features/conta/sessao";

export const Route = createFileRoute("/cliente")({
  component: Outlet,
  // O servidor confere a sessão antes de abrir qualquer página da conta. Quem não entrou vai
  // para o login e volta depois.
  beforeLoad: async ({ location }) => {
    const sessao = await obterSessao();
    if (!sessao) throw redirect({ to: "/entrar", search: { voltar: location.href } });
    return { sessao };
  },
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
});
