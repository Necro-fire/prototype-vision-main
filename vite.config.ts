import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";

// O alvo de publicação é a Hospedagem Node.js (Hostinger): o build gera `.output/server/index.mjs`.
// O Nitro só entra na compilação: no `vite dev` o servidor do próprio TanStack Start atende as páginas.
export default defineConfig(({ command, mode }) => {
  // No desenvolvimento o Vite só repassa as variáveis VITE_*. Os segredos do servidor (chave do
  // Resend, segredo do agendador) ficam no .env sem o prefixo e entram só no process.env do
  // servidor local, nunca no código que vai para o navegador. Em produção vêm dos segredos da
  // hospedagem.
  if (command === "serve") {
    for (const [nome, valor] of Object.entries(loadEnv(mode, process.cwd(), ""))) {
      process.env[nome] ??= valor;
    }
  }
  return {
    plugins: [
      tailwindcss(),
      tanstackStart({
        // src/server.ts envolve o servidor com a página de erro em português.
        server: { entry: "server" },
        importProtection: {
          behavior: "error",
          client: { files: ["**/server/**"], specifiers: ["server-only"] },
        },
      }),
      ...(command === "build" ? [nitro({ preset: "node-server" })] : []),
      viteReact(),
    ],
    css: { transformer: "lightningcss" },
    resolve: {
      tsconfigPaths: true,
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    server: { port: 8080 },
  };
});
