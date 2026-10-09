import { createFileRoute } from "@tanstack/react-router";

// Chamada pelo agendador (pg_cron, Cloudflare ou outro) com `Authorization: Bearer <CRON_SECRET>`.
// Não é página: só esvazia a fila de e-mails.
export const Route = createFileRoute("/api/emails/processar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { responderAoAgendador } = await import("@/lib/server/emails");
        return responderAoAgendador(request, {
          ...(import.meta.env as Record<string, string | undefined>),
          ...(typeof process === "undefined" ? {} : process.env),
        });
      },
    },
  },
});
