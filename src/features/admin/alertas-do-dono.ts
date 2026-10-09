// Avisos do sino do dono: novo agendamento, cancelamento e remarcação feitos pelo cliente. O banco
// os grava (gatilhos); aqui só se lê, se marca como lido e se escuta o tempo real.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { z } from "zod";

import { falhou } from "@/lib/erro-do-banco";
import { supabaseNavegador } from "@/lib/supabase-navegador";
import { chavesDoDono } from "./agenda-do-dono";

export const chavesDeAlertas = { alertas: ["admin", "alertas"], emails: ["admin", "emails"] };

export type TipoDeAlerta =
  | "novo_agendamento"
  | "cancelamento"
  | "remarcacao"
  | "falta_sem_registro"
  | "email_falhou"
  | "nova_avaliacao";

export type AlertaDoDono = {
  id: string;
  tipo: TipoDeAlerta;
  texto: string;
  criadoEm: string;
  lidoEm: string | null;
};

const linhaDeAlerta = z.object({
  id: z.string(),
  tipo: z.enum([
    "novo_agendamento",
    "cancelamento",
    "remarcacao",
    "falta_sem_registro",
    "email_falhou",
    "nova_avaliacao",
  ]),
  texto: z.string(),
  criado_em: z.string(),
  lido_em: z.string().nullable(),
});

export function alertaDoDonoDeLinha(linha: unknown): AlertaDoDono {
  const l = linhaDeAlerta.parse(linha);
  return { id: l.id, tipo: l.tipo, texto: l.texto, criadoEm: l.criado_em, lidoEm: l.lido_em };
}

export async function lerAlertas(): Promise<AlertaDoDono[]> {
  const { data, error } = await supabaseNavegador()
    .from("alertas")
    .select("id, tipo, texto, criado_em, lido_em")
    .order("criado_em", { ascending: false })
    .limit(200);
  if (error) falhou(error);
  return (data ?? []).map(alertaDoDonoDeLinha);
}

export async function marcarComoLido(id: string): Promise<void> {
  const { error } = await supabaseNavegador()
    .from("alertas")
    .update({ lido_em: new Date().toISOString() })
    .eq("id", id);
  if (error) falhou(error);
}

export async function marcarTodosComoLidos(): Promise<void> {
  const { error } = await supabaseNavegador()
    .from("alertas")
    .update({ lido_em: new Date().toISOString() })
    .is("lido_em", null);
  if (error) falhou(error);
}

// E-mail que esgotou as tentativas de envio. O sino já avisou; aqui o dono vê qual e por quê.
export type EmailComProblema = {
  id: string;
  destinatario: string;
  modelo: string;
  erro: string | null;
};

const linhaDeEmail = z.object({
  id: z.string(),
  destinatario: z.string(),
  modelo: z.string(),
  erro: z.string().nullable(),
});

export async function lerEmailsComProblema(): Promise<EmailComProblema[]> {
  const { data, error } = await supabaseNavegador()
    .from("emails_fila")
    .select("id, destinatario, modelo, erro")
    .is("enviado_em", null)
    .gte("tentativas", 5)
    .order("criado_em", { ascending: false })
    .limit(50);
  if (error) falhou(error);
  return (data ?? []).map((linha) => linhaDeEmail.parse(linha));
}

export async function reenviarEmail(id: string): Promise<void> {
  const { error } = await supabaseNavegador().rpc("reenviar_email", { p_id: id });
  if (error) falhou(error);
}

export function useEmailsComProblema() {
  return useQuery({
    queryKey: chavesDeAlertas.emails,
    queryFn: lerEmailsComProblema,
    refetchInterval: 60_000,
  });
}

export function useAlertas() {
  return useQuery({
    queryKey: chavesDeAlertas.alertas,
    queryFn: lerAlertas,
    // Rede de segurança: se o tempo real cair, o sino ainda se atualiza.
    refetchInterval: 30_000,
  });
}

export const contarNaoLidos = (alertas: AlertaDoDono[] | undefined) =>
  (alertas ?? []).filter((a) => a.lidoEm === null).length;

// Alerta novo no banco → o sino e a agenda se atualizam na hora, sem recarregar a página.
// A RLS vale também no tempo real: só o dono recebe.
export function useAlertasEmTempoReal() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const banco = supabaseNavegador();
    const canal = banco
      .channel("alertas-do-dono")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "alertas" }, () => {
        void queryClient.invalidateQueries({ queryKey: chavesDeAlertas.alertas });
        void queryClient.invalidateQueries({ queryKey: chavesDeAlertas.emails });
        void queryClient.invalidateQueries({ queryKey: chavesDoDono.agendamentos });
      })
      .subscribe();
    return () => {
      void banco.removeChannel(canal);
    };
  }, [queryClient]);
}
