// @vitest-environment node
// Paridade das situações: o que o painel oferece (src/features/admin/situacoes.ts) e o que o
// banco aceita (public.transicao_permitida) precisam concordar em todos os pares.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { todasAsSituacoes, transicaoPermitida } from "../../src/features/admin/situacoes";
import { criarBanco, type Banco } from "./ambiente";

describe("Situações do agendamento: painel e banco concordam", () => {
  let db: Banco;
  beforeAll(async () => {
    db = await criarBanco({ comSeed: false });
  });
  afterAll(async () => {
    await db.close();
  });

  it("para todos os pares de situações", async () => {
    const divergentes: string[] = [];
    for (const de of todasAsSituacoes) {
      for (const para of todasAsSituacoes) {
        const { rows } = await db.query<{ ok: boolean }>(
          "select public.transicao_permitida($1, $2) as ok",
          [de, para],
        );
        if (rows[0]?.ok !== transicaoPermitida(de, para)) divergentes.push(`${de} > ${para}`);
      }
    }
    expect(divergentes).toEqual([]);
  });

  it("o banco só conhece as situações que o painel conhece", async () => {
    const { rows } = await db.query<{ definicao: string }>(
      `select pg_get_constraintdef(oid) as definicao from pg_constraint
       where conrelid = 'public.agendamentos'::regclass and contype = 'c'
         and pg_get_constraintdef(oid) like '%situacao%'`,
    );
    const definicao = rows[0]?.definicao ?? "";
    const noBanco = [...definicao.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
    expect(noBanco).toEqual([...todasAsSituacoes].sort());
  });
});
