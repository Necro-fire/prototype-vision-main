import { Link, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Input } from "@/components/ui/input";
import { CampoDeSenha } from "@/features/conta/campo-de-senha";
import { mensagemDeLogin } from "@/features/conta/mensagens";
import {
  caminhoSeguro,
  validarCelular,
  validarEmail,
  validarNome,
  validarSenha,
} from "@/features/conta/validacao";
import { normalizePhone } from "@/lib/telefone";
import { supabaseNavegador } from "@/lib/supabase-navegador";

type Erros = {
  nome?: string | undefined;
  celular?: string | undefined;
  email?: string | undefined;
  senha?: string | undefined;
  geral?: string;
};

export function FormularioCriarConta({ voltar }: { voltar: string | undefined }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [celular, setCelular] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);
  const [enviadoPara, setEnviadoPara] = useState<string | null>(null);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const encontrados: Erros = {
      nome: validarNome(nome),
      celular: validarCelular(celular),
      email: validarEmail(email),
      senha: validarSenha(senha),
    };
    if (Object.values(encontrados).some(Boolean)) {
      setErros(encontrados);
      return;
    }
    setErros({});
    setEnviando(true);
    try {
      const destino = caminhoSeguro(voltar);
      const { data, error } = await supabaseNavegador().auth.signUp({
        email: email.trim(),
        password: senha,
        options: {
          // O banco cria o perfil a partir desses dados (gatilho criar_perfil).
          data: { nome: nome.trim(), celular: normalizePhone(celular) },
          emailRedirectTo: `${window.location.origin}/auth/confirmar?voltar=${encodeURIComponent(destino)}`,
        },
      });
      if (error) {
        setErros({ geral: mensagemDeLogin(error) });
        return;
      }
      // Sem confirmação de e-mail ligada, a conta já entra logada.
      if (data.session) {
        router.history.push(destino);
        return;
      }
      setEnviadoPara(email.trim());
    } catch (erro) {
      setErros({ geral: mensagemDeLogin(erro instanceof Error ? erro : {}) });
    } finally {
      setEnviando(false);
    }
  }

  if (enviadoPara) {
    return (
      <section
        aria-labelledby="confirme-o-email"
        className="grid gap-3 rounded-md border-2 border-foreground bg-card p-5"
      >
        <h2 id="confirme-o-email" className="font-display text-2xl font-extrabold">
          Confirme seu e-mail
        </h2>
        <p className="text-base">
          Enviamos um link para <strong>{enviadoPara}</strong>. Toque nele para ativar a conta e
          depois volte para entrar.
        </p>
        <p className="text-base text-muted-foreground">
          Não achou? Olhe a caixa de spam. O link vale por pouco tempo.
        </p>
        <Button asChild className="mt-2 justify-self-start">
          <Link to="/entrar" search={{ voltar }}>
            Ir para o login
          </Link>
        </Button>
      </section>
    );
  }

  return (
    <form onSubmit={enviar} noValidate className="grid gap-5">
      <Campo id="conta-nome" rotulo="Nome" {...(erros.nome ? { erro: erros.nome } : {})}>
        {(props) => (
          <Input
            {...props}
            autoComplete="name"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        )}
      </Campo>
      <Campo
        id="conta-celular"
        rotulo="Celular com DDD"
        ajuda="Usamos só para a barbearia falar com você sobre o horário."
        {...(erros.celular ? { erro: erros.celular } : {})}
      >
        {(props) => (
          <Input
            {...props}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={celular}
            onChange={(e) => setCelular(e.target.value)}
          />
        )}
      </Campo>
      <Campo id="conta-email" rotulo="E-mail" {...(erros.email ? { erro: erros.email } : {})}>
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
      <CampoDeSenha
        id="conta-senha"
        rotulo="Senha"
        valor={senha}
        aoMudar={setSenha}
        autoComplete="new-password"
        ajuda="Pelo menos 8 caracteres."
        erro={erros.senha}
      />
      {erros.geral && (
        <p role="alert" className="text-base font-semibold text-destructive">
          {erros.geral}
        </p>
      )}
      <Button type="submit" size="lg" disabled={enviando}>
        {enviando ? "Criando conta" : "Criar conta"}
      </Button>
      <Button asChild variant="link" className="min-h-11 justify-start">
        <Link to="/entrar" search={{ voltar }}>
          Já tenho conta
        </Link>
      </Button>
    </form>
  );
}
