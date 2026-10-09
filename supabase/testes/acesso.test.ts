// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { como, criarBanco, criarUsuario, tornarDono, type Banco } from "./ambiente";

describe("Regras de acesso do banco", () => {
  let db: Banco;
  let dono: string;
  let maria: string;
  let joao: string;

  beforeAll(async () => {
    db = await criarBanco();
    dono = await criarUsuario(db, { nome: "Dono", celular: "11900000000" });
    await tornarDono(db, dono);
    maria = await criarUsuario(db, { nome: "Maria", celular: "11999990001" });
    joao = await criarUsuario(db, { nome: "João", celular: "11999990002" });
  });
  afterAll(() => db.close());

  it("toda tabela do schema public tem RLS ligada", async () => {
    const { rows } = await db.query<{ relname: string }>(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    );
    expect(rows.map((r) => r.relname)).toEqual([]);
  });

  it("carrega o seed: 6 serviços, 3 produtos e seg a sáb das 9h às 19h", async () => {
    const contar = async (tabela: string) =>
      Number(
        (await db.query<{ n: string }>(`select count(*) as n from public.${tabela}`)).rows[0]!.n,
      );
    expect(await contar("servicos")).toBe(6);
    expect(await contar("produtos")).toBe(3);
    expect(await contar("funcionamento")).toBe(6);
    const { rows } = await db.query<{ preco_centavos: number }>(
      "select preco_centavos from public.servicos where nome = 'Corte clássico'",
    );
    expect(rows[0]?.preco_centavos).toBe(4500);
  });

  describe("visitante", () => {
    it("lê o catálogo ativo, o funcionamento e os dados da barbearia", async () => {
      await como(db, "anon", async () => {
        expect((await db.query("select * from public.servicos")).rows).toHaveLength(6);
        expect((await db.query("select * from public.produtos")).rows).toHaveLength(3);
        expect((await db.query("select * from public.funcionamento")).rows).toHaveLength(6);
        expect((await db.query("select * from public.empresa")).rows).toHaveLength(1);
        expect((await db.query("select * from public.categorias")).rows).toHaveLength(5);
      });
    });

    it.each([
      "perfis",
      "agendamentos",
      "agendamento_eventos",
      "bloqueios",
      "vendas",
      "venda_itens",
      "alertas",
      "emails_fila",
    ])("não lê %s", async (tabela) => {
      await como(db, "anon", async () => {
        await expect(db.query(`select * from public.${tabela}`)).rejects.toThrow(
          /permission denied/,
        );
      });
    });

    it("não chama as funções de agenda nem de venda", async () => {
      await como(db, "anon", async () => {
        await expect(
          db.query("select public.reservar(gen_random_uuid(), now() + interval '2 days')"),
        ).rejects.toThrow(/permission denied/);
        await expect(db.query("select public.registrar_venda('[]'::jsonb)")).rejects.toThrow(
          /permission denied/,
        );
        await expect(db.query("select public.excluir_minha_conta()")).rejects.toThrow(
          /permission denied/,
        );
      });
    });

    it("não escreve em nada", async () => {
      await como(db, "anon", async () => {
        await expect(db.query("update public.servicos set preco_centavos = 1")).rejects.toThrow(
          /permission denied/,
        );
        await expect(db.query("insert into public.categorias (nome) values ('X')")).rejects.toThrow(
          /permission denied/,
        );
      });
    });
  });

  describe("perfis", () => {
    it("é criado junto com a conta, sempre como cliente", async () => {
      const { rows } = await db.query<{ papel: string; nome: string; celular: string }>(
        "select papel, nome, celular from public.perfis where id = $1",
        [maria],
      );
      expect(rows[0]).toEqual({ papel: "cliente", nome: "Maria", celular: "11999990001" });
    });

    it("o cliente vê só o próprio; o dono vê todos", async () => {
      await como(db, maria, async () => {
        const { rows } = await db.query<{ id: string }>("select id from public.perfis");
        expect(rows.map((r) => r.id)).toEqual([maria]);
      });
      await como(db, dono, async () => {
        expect((await db.query("select id from public.perfis")).rows).toHaveLength(3);
      });
    });

    it("ninguém vira dono editando o próprio perfil", async () => {
      await como(db, maria, async () => {
        await expect(
          db.query("update public.perfis set papel = 'dono' where id = $1", [maria]),
        ).rejects.toThrow(/permission denied/);
      });
      const { rows } = await db.query<{ papel: string }>(
        "select papel from public.perfis where id = $1",
        [maria],
      );
      expect(rows[0]?.papel).toBe("cliente");
    });

    it("o cliente edita o próprio nome e celular, mas não o de outra pessoa", async () => {
      await como(db, maria, async () => {
        await db.query("update public.perfis set nome = 'Maria Souza' where id = $1", [maria]);
        const outra = await db.query(
          "update public.perfis set nome = 'X' where id = $1 returning id",
          [joao],
        );
        expect(outra.rows).toHaveLength(0);
      });
      const { rows } = await db.query<{ nome: string }>(
        "select nome from public.perfis where id in ($1, $2) order by nome",
        [maria, joao],
      );
      expect(rows.map((r) => r.nome)).toEqual(["João", "Maria Souza"]);
      await db.query("update public.perfis set nome = 'Maria' where id = $1", [maria]);
    });
  });

  describe("catálogo e regras da barbearia", () => {
    it("o cliente não altera preços nem cria serviços", async () => {
      await como(db, maria, async () => {
        const alterados = await db.query(
          "update public.servicos set preco_centavos = 1 returning id",
        );
        expect(alterados.rows).toHaveLength(0);
        await expect(
          db.query(
            "insert into public.servicos (nome, preco_centavos, duracao_minutos) values ('X', 1, 30)",
          ),
        ).rejects.toThrow(/row-level security/);
      });
    });

    it("o dono altera o catálogo", async () => {
      await como(db, dono, async () => {
        const { rows } = await db.query<{ preco_centavos: number }>(
          "update public.servicos set preco_centavos = 5000 where nome = 'Corte clássico' returning preco_centavos",
        );
        expect(rows[0]?.preco_centavos).toBe(5000);
      });
      await db.query(
        "update public.servicos set preco_centavos = 4500 where nome = 'Corte clássico'",
      );
    });

    it("serviço inativo some para o visitante e continua visível para o dono", async () => {
      await db.query("update public.servicos set ativo = false where nome = 'FreeStyle'");
      await como(db, "anon", async () => {
        expect((await db.query("select * from public.servicos")).rows).toHaveLength(5);
      });
      await como(db, dono, async () => {
        expect((await db.query("select * from public.servicos")).rows).toHaveLength(6);
      });
      await db.query("update public.servicos set ativo = true where nome = 'FreeStyle'");
    });

    it("só o dono altera as regras da empresa", async () => {
      await como(db, maria, async () => {
        const { rows } = await db.query(
          "update public.empresa set max_agendamentos_futuros = 20 returning id",
        );
        expect(rows).toHaveLength(0);
      });
      await como(db, dono, async () => {
        const { rows } = await db.query(
          "update public.empresa set telefone = '11 99999-0000' returning telefone",
        );
        expect(rows).toHaveLength(1);
      });
      await db.query("update public.empresa set telefone = null");
    });

    it("o cliente não escreve direto em agendamentos, vendas nem alertas", async () => {
      await como(db, maria, async () => {
        await expect(
          db.query("insert into public.agendamentos (cliente_nome) values ('x')"),
        ).rejects.toThrow(/permission denied/);
        await expect(db.query("update public.agendamentos set preco_centavos = 0")).rejects.toThrow(
          /permission denied/,
        );
        await expect(db.query("delete from public.agendamentos")).rejects.toThrow(
          /permission denied/,
        );
        expect((await db.query("select * from public.vendas")).rows).toHaveLength(0);
        expect((await db.query("select * from public.emails_fila")).rows).toHaveLength(0);
      });
    });
  });
});
