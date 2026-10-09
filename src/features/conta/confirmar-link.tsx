import { Link, useRouter } from "@tanstack/react-router";
import type { EmailOtpType } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { mensagemDeLogin } from "@/features/conta/mensagens";
import { caminhoSeguro } from "@/features/conta/validacao";
import { supabaseNavegador } from "@/lib/supabase-navegador";

// Página de destino dos links de e-mail (confirmar conta e recuperar senha). Troca o código do
// link por uma sessão e leva a pessoa para onde ela ia.
export function ConfirmarLink() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  // O código do link só vale uma vez; o modo estrito do React roda o efeito duas vezes em dev.
  const iniciou = useRef(false);

  useEffect(() => {
    if (iniciou.current) return;
    iniciou.current = true;

    async function confirmar() {
      const consulta = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const codigoDeErro = hash.get("error_code") ?? consulta.get("error_code");
      if (codigoDeErro) {
        setErro(mensagemDeLogin({ code: codigoDeErro }));
        return;
      }

      const banco = supabaseNavegador();
      const tokenHash = consulta.get("token_hash");
      const codigo = consulta.get("code");
      const tipo = consulta.get("type");
      let falha: { code?: string | undefined; message?: string } | null = null;

      if (tokenHash && tipo) {
        const { error } = await banco.auth.verifyOtp({
          token_hash: tokenHash,
          type: tipo as EmailOtpType,
        });
        falha = error;
      } else if (codigo) {
        const { error } = await banco.auth.exchangeCodeForSession(codigo);
        falha = error;
      } else {
        falha = { code: "flow_state_not_found" };
      }

      if (falha) {
        setErro(mensagemDeLogin(falha));
        return;
      }
      const recuperacao = consulta.get("tipo") === "recuperacao" || tipo === "recovery";
      router.history.push(recuperacao ? "/redefinir-senha" : caminhoSeguro(consulta.get("voltar")));
    }

    confirmar().catch((falha: unknown) => {
      setErro(mensagemDeLogin(falha instanceof Error ? falha : {}));
    });
  }, [router]);

  if (erro) {
    return (
      <section className="grid gap-3 rounded-md border-2 border-foreground bg-card p-5">
        <p role="alert" className="text-base font-semibold">
          {erro}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/entrar" search={{ voltar: undefined }}>
              Ir para o login
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/recuperar-senha">Pedir novo link</Link>
          </Button>
        </div>
      </section>
    );
  }
  return <p className="text-base text-muted-foreground">Confirmando seu link.</p>;
}
