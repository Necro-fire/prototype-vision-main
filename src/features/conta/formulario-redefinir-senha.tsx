import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { CampoDeSenha } from "@/features/conta/campo-de-senha";
import { mensagemDeLogin } from "@/features/conta/mensagens";
import { validarSenha } from "@/features/conta/validacao";
import { supabaseNavegador } from "@/lib/supabase-navegador";

// Chega aqui pelo link do e-mail, que já abriu uma sessão de recuperação (/auth/confirmar).
export function FormularioRedefinirSenha() {
  const router = useRouter();
  const [temSessao, setTemSessao] = useState<boolean | null>(null);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | undefined>();
  const [geral, setGeral] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    supabaseNavegador()
      .auth.getSession()
      .then(({ data }) => setTemSessao(Boolean(data.session)))
      .catch(() => setTemSessao(false));
  }, []);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const problema = validarSenha(senha);
    setErro(problema);
    setGeral(undefined);
    if (problema) return;
    setEnviando(true);
    try {
      const { error } = await supabaseNavegador().auth.updateUser({ password: senha });
      if (error) {
        setGeral(mensagemDeLogin(error));
        return;
      }
      router.history.push("/cliente");
    } catch (falha) {
      setGeral(mensagemDeLogin(falha instanceof Error ? falha : {}));
    } finally {
      setEnviando(false);
    }
  }

  if (temSessao === null) {
    return <p className="text-base text-muted-foreground">Conferindo o link.</p>;
  }

  if (!temSessao) {
    return (
      <section className="grid gap-3 rounded-xl border border-line bg-card p-5">
        <p role="alert" className="text-base font-semibold">
          Esse link venceu ou já foi usado. Peça um novo para criar a senha.
        </p>
        <Button asChild className="justify-self-start">
          <Link to="/recuperar-senha">Pedir novo link</Link>
        </Button>
      </section>
    );
  }

  return (
    <form onSubmit={enviar} noValidate className="grid gap-5">
      <CampoDeSenha
        id="nova-senha"
        rotulo="Nova senha"
        valor={senha}
        aoMudar={setSenha}
        autoComplete="new-password"
        ajuda="Pelo menos 8 caracteres."
        erro={erro}
      />
      {geral && (
        <p role="alert" className="text-base font-semibold text-destructive">
          {geral}
        </p>
      )}
      <Button type="submit" size="lg" disabled={enviando}>
        {enviando ? "Salvando" : "Salvar nova senha"}
      </Button>
    </form>
  );
}
