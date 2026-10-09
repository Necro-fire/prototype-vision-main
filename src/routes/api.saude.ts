import { createFileRoute } from "@tanstack/react-router";

import { verificarSaude } from "@/lib/saude";

// Para o monitor de disponibilidade: 200 se o site e o banco respondem, 503 se não.
export const Route = createFileRoute("/api/saude")({
  server: {
    handlers: {
      GET: () => verificarSaude(),
      HEAD: () => verificarSaude(),
    },
  },
});
