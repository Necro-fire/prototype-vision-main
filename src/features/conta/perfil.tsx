import { useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Input } from "@/components/ui/input";
import { excluirMinhaConta, salvarPerfil } from "@/features/agenda/agendamentos";
import { useSair } from "@/features/conta/sair";
import type { Sessao } from "@/features/conta/sessao";
import { validarCelular, validarNome } from "@/features/conta/validacao";
import { normalizePhone } from "@/lib/telefone";

export function PerfilDoCliente({ sessao }: { sessao: Sessao }) {
  const router = useRouter();
  const sair = useSair();
  const [nome, setNome] = useState(sessao.nome);
  const [celular, setCelular] = useState(sessao.celular ?? "");
  const [lembretes, setLembretes] = useState(sessao.lembretesPorEmail);
  const [erros, setErros] = useState<{ nome?: string | undefined; celular?: string | undefined }>(
    {},
  );
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const encontrados = { nome: validarNome(nome), celular: validarCelular(celular) };
    setErros(encontrados);
    setAviso(null);
    if (encontrados.nome || encontrados.celular) return;
    setSalvando(true);
    try {
      await salvarPerfil(sessao.id, {
        nome: nome.trim(),
        celular: normalizePhone(celular),
        lembretesPorEmail: lembretes,
      });
      await router.invalidate();
      setAviso({ tipo: "ok", texto: "Dados salvos." });
    } catch (erro) {
      setAviso({
        tipo: "erro",
        texto: erro instanceof Error ? erro.message : "Não foi possível salvar.",
      });
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    setExcluindo(true);
    try {
      await excluirMinhaConta();
      await sair();
    } catch (erro) {
      setConfirmandoExclusao(false);
      setAviso({
        tipo: "erro",
        texto: erro instanceof Error ? erro.message : "Não foi possível excluir a conta.",
      });
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-xl gap-8 px-5 pb-20 pt-10">
      <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">Meu perfil</h1>

      {aviso && (
        <p
          role={aviso.tipo === "erro" ? "alert" : "status"}
          className={
            aviso.tipo === "erro"
              ? "rounded-md bg-destructive-soft px-4 py-3 text-base font-semibold text-destructive"
              : "rounded-md bg-success-soft px-4 py-3 text-base font-semibold text-success"
          }
        >
          {aviso.texto}
        </p>
      )}

      <form onSubmit={salvar} noValidate className="grid gap-5">
        <Campo
          id="perfil-email"
          rotulo="E-mail"
          ajuda="Para trocar o e-mail, fale com a barbearia."
        >
          {(props) => <Input {...props} value={sessao.email} readOnly />}
        </Campo>
        <Campo id="perfil-nome" rotulo="Nome" {...(erros.nome ? { erro: erros.nome } : {})}>
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
          id="perfil-celular"
          rotulo="Celular com DDD"
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
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base font-semibold">
          <input
            type="checkbox"
            checked={lembretes}
            onChange={(e) => setLembretes(e.target.checked)}
            className="size-6 shrink-0 accent-foreground"
          />
          Receber lembrete por e-mail na véspera do horário
        </label>
        <Button type="submit" size="lg" disabled={salvando} className="justify-self-start">
          {salvando ? "Salvando" : "Salvar dados"}
        </Button>
      </form>

      <section aria-labelledby="excluir-conta" className="grid gap-3 border-t border-border pt-8">
        <h2 id="excluir-conta" className="font-display text-2xl font-extrabold">
          Excluir minha conta
        </h2>
        <p className="text-base text-muted-foreground">
          Seus dados pessoais são apagados. Os horários já atendidos ficam no caixa da barbearia,
          sem o seu nome e sem o seu celular. Não dá para desfazer.
        </p>
        <Button
          variant="outline"
          className="justify-self-start"
          onClick={() => setConfirmandoExclusao(true)}
        >
          Excluir minha conta
        </Button>
      </section>

      <AlertDialog open={confirmandoExclusao} onOpenChange={setConfirmandoExclusao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir sua conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Você sai do site e perde o acesso aos seus horários. Isso não pode ser desfeito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter minha conta</AlertDialogCancel>
            <AlertDialogAction
              onClick={(evento) => {
                evento.preventDefault();
                void excluir();
              }}
            >
              {excluindo ? "Excluindo" : "Excluir minha conta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
