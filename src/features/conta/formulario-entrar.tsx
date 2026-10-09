import { Link, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Input } from "@/components/ui/input";
import { CampoDeSenha } from "@/features/conta/campo-de-senha";
import { mensagemDeLogin } from "@/features/conta/mensagens";
import { caminhoSeguro, validarEmail } from "@/features/conta/validacao";
import { supabaseNavegador } from "@/lib/supabase-navegador";

type Erros = { email?: string | undefined; senha?: string | undefined; geral?: string };

export function FormularioEntrar({ voltar }: { voltar: string | undefined }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const encontrados: Erros = {
      email: validarEmail(email),
      senha: senha ? undefined : "Informe sua senha.",
    };
    if (encontrados.email || encontrados.senha) {
      setErros(encontrados);
      return;
    }
    setErros({});
    setEnviando(true);
    try {
      const banco = supabaseNavegador();
      const { data, error } = await banco.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });
      if (error || !data.user) {
        setErros({ geral: mensagemDeLogin(error ?? {}) });
        return;
      }
      // O dono vai para o painel; o cliente, para a conta dele. `voltar` vence os dois.
      const { data: perfil } = await banco
        .from("perfis")
        .select("papel")
        .eq("id", data.user.id)
        .maybeSingle();
      const padrao = perfil?.papel === "dono" ? "/admin" : "/cliente";
      router.history.push(voltar ? caminhoSeguro(voltar, padrao) : padrao);
    } catch (erro) {
      setErros({ geral: mensagemDeLogin(erro instanceof Error ? erro : {}) });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="grid gap-5">
      <Campo id="entrar-email" rotulo="E-mail" {...(erros.email ? { erro: erros.email } : {})}>
        {(props) => (
          <Input
            {...props}
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
      </Campo>
      <CampoDeSenha
        id="entrar-senha"
        rotulo="Senha"
        valor={senha}
        aoMudar={setSenha}
        autoComplete="current-password"
        erro={erros.senha}
      />
      {erros.geral && (
        <p role="alert" className="text-base font-semibold text-destructive">
          {erros.geral}
        </p>
      )}
      <Button type="submit" size="lg" disabled={enviando}>
        {enviando ? "Entrando" : "Entrar"}
      </Button>
      <div className="grid gap-1">
        <Button asChild variant="link" className="min-h-11 justify-start">
          <Link to="/recuperar-senha">Esqueci minha senha</Link>
        </Button>
        <Button asChild variant="link" className="min-h-11 justify-start">
          <Link to="/criar-conta" search={{ voltar }}>
            Ainda não tenho conta
          </Link>
        </Button>
      </div>
    </form>
  );
}
