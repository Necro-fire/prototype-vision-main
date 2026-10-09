// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { como, criarBanco, criarUsuario, idDoProduto, tornarDono, type Banco } from "./ambiente";

type Venda = {
  id: string;
  total_centavos: number;
  desconto_centavos: number;
  forma_pagamento: string | null;
  estornada_em: string | null;
  criado_por: string;
};

describe("Vendas de produtos no banco", () => {
  let db: Banco;
  let dono: string;
  let maria: string;
  let maquina: string; // R$ 189,00
  let pente: string; // R$ 25,00

  beforeAll(async () => {
    db = await criarBanco();
    dono = await criarUsuario(db, { nome: "Dono", celular: "11900000000" });
    await tornarDono(db, dono);
    maria = await criarUsuario(db, { nome: "Maria", celular: "11999990001" });
    maquina = await idDoProduto(db, "Máquina de acabamento");
    pente = await idDoProduto(db, "Pente profissional");
  });
  afterAll(() => db.close());

  beforeEach(async () => {
    await db.exec("truncate public.vendas cascade");
  });

  const vender = (
    quem: string,
    itens: { produto_id: string; quantidade: number }[],
    forma: string | null = "pix",
    desconto = 0,
  ) =>
    como(db, quem, async () => {
      const { rows } = await db.query<Venda>(
        "select * from public.registrar_venda($1::jsonb, $2, $3)",
        [JSON.stringify(itens), forma, desconto],
      );
      return rows[0]!;
    });

  it("soma os itens a partir do preço do produto, e não do que a tela mandar", async () => {
    const venda = await vender(dono, [
      { produto_id: maquina, quantidade: 2 },
      { produto_id: pente, quantidade: 1 },
    ]);
    expect(venda.total_centavos).toBe(2 * 18900 + 2500);
    expect(venda.desconto_centavos).toBe(0);
    expect(venda.forma_pagamento).toBe("pix");
    expect(venda.criado_por).toBe(dono);
    const { rows } = await db.query<{
      produto_nome: string;
      preco_centavos: number;
      quantidade: number;
    }>(
      "select produto_nome, preco_centavos, quantidade from public.venda_itens order by preco_centavos",
    );
    expect(rows).toEqual([
      { produto_nome: "Pente profissional", preco_centavos: 2500, quantidade: 1 },
      { produto_nome: "Máquina de acabamento", preco_centavos: 18900, quantidade: 2 },
    ]);
  });

  it("guarda o preço da hora da venda, mesmo se o produto mudar depois", async () => {
    await vender(dono, [{ produto_id: pente, quantidade: 1 }]);
    await db.query("update public.produtos set preco_centavos = 9900 where id = $1", [pente]);
    const { rows } = await db.query<{ preco_centavos: number }>(
      "select preco_centavos from public.venda_itens",
    );
    expect(rows[0]?.preco_centavos).toBe(2500);
    await db.query("update public.produtos set preco_centavos = 2500 where id = $1", [pente]);
  });

  it("aplica o desconto ao total, sem deixar passar do valor da venda", async () => {
    const venda = await vender(dono, [{ produto_id: pente, quantidade: 2 }], "dinheiro", 500);
    expect(venda.total_centavos).toBe(4500);
    expect(venda.desconto_centavos).toBe(500);
    await expect(vender(dono, [{ produto_id: pente, quantidade: 1 }], "pix", 2501)).rejects.toThrow(
      /desconto_invalido/,
    );
    await expect(vender(dono, [{ produto_id: pente, quantidade: 1 }], "pix", -1)).rejects.toThrow(
      /desconto_invalido/,
    );
  });

  it("recusa venda vazia, quantidade inválida e produto inativo", async () => {
    await expect(vender(dono, [])).rejects.toThrow(/venda_vazia/);
    await expect(vender(dono, [{ produto_id: pente, quantidade: 0 }])).rejects.toThrow(
      /quantidade_invalida/,
    );
    await db.query("update public.produtos set ativo = false where id = $1", [pente]);
    await expect(vender(dono, [{ produto_id: pente, quantidade: 1 }])).rejects.toThrow(
      /produto_indisponivel/,
    );
    await db.query("update public.produtos set ativo = true where id = $1", [pente]);
  });

  it("uma venda recusada não deixa nada gravado", async () => {
    await expect(
      vender(dono, [
        { produto_id: pente, quantidade: 1 },
        { produto_id: crypto.randomUUID(), quantidade: 1 },
      ]),
    ).rejects.toThrow(/produto_indisponivel/);
    expect((await db.query("select * from public.vendas")).rows).toHaveLength(0);
    expect((await db.query("select * from public.venda_itens")).rows).toHaveLength(0);
  });

  it("aceita só formas de pagamento conhecidas", async () => {
    await expect(vender(dono, [{ produto_id: pente, quantidade: 1 }], "cheque")).rejects.toThrow(
      /check constraint/,
    );
  });

  it("o cliente não registra nem estorna venda", async () => {
    await expect(vender(maria, [{ produto_id: pente, quantidade: 1 }])).rejects.toThrow(
      /sem_permissao/,
    );
    const venda = await vender(dono, [{ produto_id: pente, quantidade: 1 }]);
    await expect(
      como(db, maria, () => db.query("select public.estornar_venda($1)", [venda.id])),
    ).rejects.toThrow(/sem_permissao/);
  });

  it("só o dono lê as vendas e os itens", async () => {
    await vender(dono, [{ produto_id: pente, quantidade: 1 }]);
    await como(db, maria, async () => {
      expect((await db.query("select * from public.vendas")).rows).toHaveLength(0);
      expect((await db.query("select * from public.venda_itens")).rows).toHaveLength(0);
    });
    await como(db, dono, async () => {
      expect((await db.query("select * from public.vendas")).rows).toHaveLength(1);
    });
  });

  it("não se escreve em vendas direto: só pelas funções", async () => {
    await como(db, dono, async () => {
      await expect(
        db.query("insert into public.vendas (total_centavos) values (1)"),
      ).rejects.toThrow(/permission denied/);
      await expect(db.query("delete from public.vendas")).rejects.toThrow(/permission denied/);
    });
  });

  it("estorna sem apagar, e uma venda só se estorna uma vez", async () => {
    const venda = await vender(dono, [{ produto_id: pente, quantidade: 1 }]);
    const { rows } = await como(db, dono, () =>
      db.query<Venda>("select * from public.estornar_venda($1)", [venda.id]),
    );
    expect(rows[0]?.estornada_em).not.toBeNull();
    expect((await db.query("select * from public.vendas")).rows).toHaveLength(1);
    await expect(
      como(db, dono, () => db.query("select public.estornar_venda($1)", [venda.id])),
    ).rejects.toThrow(/ja_estornada/);
    await expect(
      como(db, dono, () => db.query("select public.estornar_venda($1)", [crypto.randomUUID()])),
    ).rejects.toThrow(/venda_inexistente/);
  });

  it("não deixa apagar um produto que já foi vendido", async () => {
    await vender(dono, [{ produto_id: pente, quantidade: 1 }]);
    await expect(db.query("delete from public.produtos where id = $1", [pente])).rejects.toThrow(
      /foreign key/,
    );
  });

  it("não deixa apagar um serviço que já foi agendado", async () => {
    const { rows } = await db.query<{ id: string }>("select id from public.servicos limit 1");
    await db.query(
      `insert into public.agendamentos (cliente_id, cliente_nome, cliente_celular, servico_id,
         servico_nome, preco_centavos, duracao_minutos, inicio, fim)
       values ($1, 'Maria', '11999990001', $2, 'X', 100, 30,
         now() + interval '3 days', now() + interval '3 days 30 minutes')`,
      [maria, rows[0]!.id],
    );
    await expect(
      db.query("delete from public.servicos where id = $1", [rows[0]!.id]),
    ).rejects.toThrow(/foreign key/);
    await db.exec("truncate public.agendamentos cascade");
  });
});
