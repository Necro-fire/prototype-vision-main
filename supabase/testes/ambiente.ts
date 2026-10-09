// Ambiente de teste do banco: um Postgres de verdade (PGlite) com o que o Supabase fornece
// (papéis anon e authenticated, auth.users e auth.uid()). As migrações rodam do zero, e cada
// teste age "como" um usuário, passando pelas mesmas regras de acesso que valem em produção.
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = join(process.cwd(), "supabase");

// No Supabase tabelas e funções novas chegam abertas para anon e authenticated. Reproduzimos isso
// para que as migrações precisem fechar o acesso, como em produção.
const ambienteSupabase = `
  create schema extensions;
  create schema auth;
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public, extensions, auth to anon, authenticated;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    raw_user_meta_data jsonb not null default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
`;

export type Banco = PGlite;

export async function criarBanco({ comSeed = true } = {}): Promise<Banco> {
  const db = new PGlite({ extensions: { btree_gist } });
  await db.exec(ambienteSupabase);
  const migracoes = readdirSync(join(raiz, "migrations"))
    .filter((nome) => nome.endsWith(".sql"))
    .sort();
  for (const nome of migracoes) {
    await db.exec(readFileSync(join(raiz, "migrations", nome), "utf8"));
  }
  if (comSeed) await db.exec(readFileSync(join(raiz, "seed.sql"), "utf8"));
  return db;
}

export async function criarUsuario(
  db: Banco,
  dados: { nome?: string; celular?: string } = {},
): Promise<string> {
  const id = crypto.randomUUID();
  await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [
    id,
    `${id}@teste.local`,
    JSON.stringify({ nome: dados.nome ?? "", celular: dados.celular ?? null }),
  ]);
  return id;
}

export async function tornarDono(db: Banco, id: string) {
  await db.query("update public.perfis set papel = 'dono' where id = $1", [id]);
}

// Roda `fn` com o papel e o usuário informados e volta ao superusuário no fim.
export async function como<T>(db: Banco, quem: string | "anon", fn: () => Promise<T>): Promise<T> {
  await db.exec(quem === "anon" ? "set role anon" : "set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
    quem === "anon" ? "" : quem,
  ]);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

// Instantes no fuso da barbearia (America/Sao_Paulo, sem horário de verão desde 2019: UTC-3).
export function emSaoPaulo(diasAFrente: number, hora: string): string {
  const agora = new Date(Date.now() - 3 * 3600 * 1000);
  const dia = new Date(
    Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate() + diasAFrente),
  );
  return `${dia.toISOString().slice(0, 10)}T${hora}:00-03:00`;
}

// Quantos dias à frente cai o próximo dia da semana pedido (0 = domingo), com folga mínima.
export function diasAteDiaDaSemana(diaDaSemana: number, minimo = 2): number {
  const agora = new Date(Date.now() - 3 * 3600 * 1000);
  for (let n = minimo; n < minimo + 7; n++) {
    const dia = new Date(
      Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate() + n),
    );
    if (dia.getUTCDay() === diaDaSemana) return n;
  }
  throw new Error("dia da semana inválido");
}

export const idDoServico = async (db: Banco, nome: string) =>
  (await db.query<{ id: string }>("select id from public.servicos where nome = $1", [nome]))
    .rows[0]!.id;

export const idDoProduto = async (db: Banco, nome: string) =>
  (await db.query<{ id: string }>("select id from public.produtos where nome = $1", [nome]))
    .rows[0]!.id;
