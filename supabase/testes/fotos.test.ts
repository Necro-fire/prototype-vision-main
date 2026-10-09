// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { como, criarBanco, criarUsuario, tornarDono, type Banco } from "./ambiente";

// O Postgres de teste não tem o serviço de arquivos do Supabase: aqui se prova o que é do banco
// (o bucket e quem pode mexer nos objetos). O envio de verdade só se prova no projeto real.
describe("Fotos do catálogo (bucket e permissões)", () => {
  let db: Banco;
  let dono: string;
  let maria: string;

  beforeAll(async () => {
    db = await criarBanco();
    dono = await criarUsuario(db, { nome: "Dono", celular: "11900000000" });
    await tornarDono(db, dono);
    maria = await criarUsuario(db, { nome: "Maria", celular: "11999990001" });
    await db.exec(`insert into storage.buckets (id, name) values ('outro', 'outro')`);
  });
  afterAll(() => db.close());

  beforeEach(async () => {
    await db.exec("truncate storage.objects");
  });

  const enviar = (quem: string | "anon", bucket: string, nome = "servicos/a.webp") =>
    como(db, quem, () =>
      db.query("insert into storage.objects (bucket_id, name) values ($1, $2)", [bucket, nome]),
    );
  const guardado = (bucket: string, nome: string) =>
    db.query("insert into storage.objects (bucket_id, name) values ($1, $2)", [bucket, nome]);
  const contar = (quem: string | "anon") =>
    como(db, quem, async () =>
      Number(
        (await db.query<{ n: string }>("select count(*) as n from storage.objects")).rows[0]!.n,
      ),
    );

  it("o bucket é público, limitado a 5 MB e só aceita jpeg, png e webp", async () => {
    const { rows } = await db.query<{
      public: boolean;
      file_size_limit: string;
      allowed_mime_types: string[];
    }>(
      "select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'catalogo'",
    );
    expect(rows[0]).toMatchObject({
      public: true,
      allowed_mime_types: ["image/jpeg", "image/png", "image/webp"],
    });
    expect(Number(rows[0]!.file_size_limit)).toBe(5 * 1024 * 1024);
  });

  it("o dono envia, vê, troca e apaga fotos do catálogo", async () => {
    await enviar(dono, "catalogo");
    expect(await contar(dono)).toBe(1);
    await como(db, dono, () =>
      db.query("update storage.objects set name = 'servicos/b.webp' where bucket_id = 'catalogo'"),
    );
    const { rows } = await db.query<{ name: string }>("select name from storage.objects");
    expect(rows[0]!.name).toBe("servicos/b.webp");
    await como(db, dono, () =>
      db.query("delete from storage.objects where bucket_id = 'catalogo'"),
    );
    expect(await contar(dono)).toBe(0);
  });

  it("visitante e cliente não enviam foto", async () => {
    for (const quem of ["anon", maria] as const) {
      await expect(enviar(quem, "catalogo")).rejects.toThrow(
        /permission denied|row-level security/,
      );
    }
    expect(await contar(dono)).toBe(0);
  });

  it("cliente não troca nem apaga a foto do dono", async () => {
    await guardado("catalogo", "servicos/a.webp");
    await como(db, maria, () =>
      db.query("update storage.objects set name = 'servicos/invadido.webp'"),
    );
    await como(db, maria, () => db.query("delete from storage.objects"));
    const { rows } = await db.query<{ name: string }>("select name from storage.objects");
    expect(rows.map((r) => r.name)).toEqual(["servicos/a.webp"]);
  });

  it("o dono só mexe no bucket do catálogo, não em outros", async () => {
    await expect(enviar(dono, "outro")).rejects.toThrow(/row-level security/);
  });
});
