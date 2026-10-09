import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Input } from "@/components/ui/input";
import { mensagemDeLogin } from "@/features/conta/mensagens";
import { validarEmail } from "@/features/conta/validacao";
import { supabaseNavegador } from "@/lib/supabase-navegador";

export function FormularioRecuperarSenha() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | undefined>();
  const [geral, setGeral] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const problema = validarEmail(email);
    setErro(problema);
    setGeral(undefined);
    if (problema) return;
    setEnviando(true);
    try {
      const { error } = await supabaseNavegador().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/confirmar?tipo=recuperacao`,
      });
      if (error) {
        setGeral(mensagemDeLogin(error));
        return;
      }
      setEnviado(true);
    } catch (falha) {
      setGeral(mensagemDeLogin(falha instanceof Error ? falha : {}));
    } finally {
      setEnviando(false);
    }
  }

  // A resposta é a mesma exista a conta ou não: ninguém descobre quem tem cadastro.
  if (enviado) {
    return (
      <section
        aria-labelledby="link-enviado"
        className="grid gap-3 rounded-md border-2 border-foreground bg-card p-5"
      >
        <h2 id="link-enviado" className="font-display text-2xl font-extrabold">
          Veja seu e-mail
        </h2>
        <p className="text-base">
          Se houver uma conta com <strong>{email.trim()}</strong>, enviamos um link para criar uma
          nova senha. Olhe também a caixa de spam.
        </p>
        <Button asChild variant="outline" className="mt-2 justify-self-start">
          <Link to="/entrar" search={{ voltar: undefined }}>
            Voltar ao login
          </Link>
        </Button>
      </section>
    );
  }

  return (
    <form onSubmit={enviar} noValidate className="grid gap-5">
      <Campo id="recuperar-email" rotulo="E-mail da conta" {...(erro ? { erro } : {})}>
        {(props) => (
          <Input
            {...props}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
      </Campo>
      {geral && (
        <p role="alert" className="text-base font-semibold text-destructive">
          {geral}
        </p>
      )}
      <Button type="submit" size="lg" disabled={enviando}>
        {enviando ? "Enviando" : "Enviar link"}
      </Button>
      <Button asChild variant="link" className="min-h-11 justify-start">
        <Link to="/entrar" search={{ voltar: undefined }}>
          Voltar ao login
        </Link>
      </Button>
    </form>
  );
}
