// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  como,
  criarBanco,
  criarUsuario,
  idDoProduto,
  idDoServico,
  tornarDono,
  type Banco,
} from "./ambiente";

type Caixa = {
  id: string;
  valor_inicial_centavos: number;
  fechado_em: string | null;
  valor_contado_centavos: number | null;
  esperado_centavos: number | null;
  diferenca_centavos: number | null;
  resumo: Record<
    string,
    { entradas_centavos: number; estornos_centavos: number; quantidade: number }
  >;
  observacao: string;
};

type Resumo = {
  por_forma: Caixa["resumo"];
  esperado_centavos: number;
};

describe("Forma de pagamento, avulso e caixa no banco", () => {
  let db: Banco;
  let dono: string;
  let maria: string;
  let corte: string; // 30 min, R$ 45
  let corteBarba: string; // 60 min, R$ 70
  let pente: string; // R$ 25
  let maquina: string; // R$ 189

  beforeAll(async () => {
    db = await criarBanco();
    dono = await criarUsuario(db, { nome: "Dono", celular: "11900000000" });
    await tornarDono(db, dono);
    maria = await criarUsuario(db, { nome: "Maria", celular: "11999990001" });
    corte = await idDoServico(db, "Corte clássico");
    corteBarba = await idDoServico(db, "Corte + barba");
    pente = await idDoProduto(db, "Pente profissional");
    maquina = await idDoProduto(db, "Máquina de acabamento");
  });
  afterAll(() => db.close());

  beforeEach(async () => {
    await db.exec(
      "truncate public.caixas, public.agendamentos, public.vendas, public.alertas cascade",
    );
  });

  // Um atendimento da Maria já em atendimento (inserido direto, como superusuário).
  // Cada um ganha o próprio horário, uma hora antes do anterior, para não bater na restrição.
  let deslocamento = 0;
  async function emAtendimento(servico = corte, preco = 4500) {
    deslocamento += 1;
    const { rows } = await db.query<{ id: string }>(
      `insert into public.agendamentos (cliente_id, cliente_nome, cliente_celular, servico_id,
         servico_nome, preco_centavos, duracao_minutos, inicio, fim, situacao)
       values ($1, 'Maria', '11999990001', $2, 'Serviço', $3, 30,
         now() - make_interval(hours => $4), now() - make_interval(hours => $4) + interval '30 minutes',
         'em_atendimento')
       returning id`,
      [maria, servico, preco, deslocamento],
    );
    return rows[0]!.id;
  }

  const concluir = (id: string, forma: string | null) =>
    como(db, dono, () =>
      db.query("select * from public.mudar_situacao($1, 'concluido', $2)", [id, forma]),
    );

  const vender = (itens: { produto_id: string; quantidade: number }[], forma: string | null) =>
    como(db, dono, async () => {
      const { rows } = await db.query<{ id: string }>(
        "select * from public.registrar_venda($1::jsonb, $2)",
        [JSON.stringify(itens), forma],
      );
      return rows[0]!;
    });

  const abrir = (valor = 0) =>
    como(db, dono, async () => {
      const { rows } = await db.query<Caixa>("select * from public.abrir_caixa($1)", [valor]);
      return rows[0]!;
    });

  const fechar = (contado: number, obs = "") =>
    como(db, dono, async () => {
      const { rows } = await db.query<Caixa>("select * from public.fechar_caixa($1, $2)", [
        contado,
        obs,
      ]);
      return rows[0]!;
    });

  const resumo = (id: string) =>
    como(db, dono, async () => {
      const { rows } = await db.query<{ r: Resumo }>("select public.resumo_do_caixa($1) as r", [
        id,
      ]);
      return rows[0]!.r;
    });

  describe("forma de pagamento", () => {
    it("concluir pede a forma e guarda como foi pago e quando", async () => {
      const id = await emAtendimento();
      await expect(concluir(id, null)).rejects.toThrow(/forma_pagamento_obrigatoria/);
      const { rows } = await concluir(id, "pix");
      expect(rows[0]).toMatchObject({ situacao: "concluido", forma_pagamento: "pix" });
      expect((rows[0] as { pago_em: string }).pago_em).not.toBeNull();
    });

    it("recusa forma desconhecida, e o atendimento continua em atendimento", async () => {
      const id = await emAtendimento();
      await expect(concluir(id, "cheque")).rejects.toThrow(/check constraint/);
      const { rows } = await db.query<{ situacao: string }>(
        "select situacao from public.agendamentos where id = $1",
        [id],
      );
      expect(rows[0]?.situacao).toBe("em_atendimento");
    });

    it("outras mudanças de situação não pedem forma de pagamento", async () => {
      const { rows } = await db.query<{ id: string }>(
        `insert into public.agendamentos (cliente_id, cliente_nome, cliente_celular, servico_id,
           servico_nome, preco_centavos, duracao_minutos, inicio, fim)
         values ($1, 'Maria', '11999990001', $2, 'Serviço', 4500, 30,
           now() + interval '3 days', now() + interval '3 days 30 minutes') returning id`,
        [maria, corte],
      );
      await como(db, dono, () =>
        db.query("select public.mudar_situacao($1, 'confirmado')", [rows[0]!.id]),
      );
      const depois = await db.query<{ situacao: string; forma_pagamento: string | null }>(
        "select situacao, forma_pagamento from public.agendamentos where id = $1",
        [rows[0]!.id],
      );
      expect(depois.rows[0]).toEqual({ situacao: "confirmado", forma_pagamento: null });
    });

    it("a venda também pede a forma de pagamento", async () => {
      await expect(vender([{ produto_id: pente, quantidade: 1 }], null)).rejects.toThrow(
        /forma_pagamento_obrigatoria/,
      );
      expect((await db.query("select * from public.vendas")).rows).toHaveLength(0);
    });
  });

  describe("atendimento avulso", () => {
    const avulso = (quem: string, servico: string, forma: string | null, nome = "") =>
      como(db, quem, async () => {
        const { rows } = await db.query<{
          id: string;
          cliente_id: string | null;
          cliente_nome: string;
          situacao: string;
          avulso: boolean;
          preco_centavos: number;
          forma_pagamento: string;
        }>("select * from public.registrar_atendimento_avulso($1, $2, $3)", [servico, forma, nome]);
        return rows[0]!;
      });

    it("entra como concluído, pago e sem conta de cliente, com o preço do serviço", async () => {
      const a = await avulso(dono, corteBarba, "dinheiro", "  Seu Zé ");
      expect(a).toMatchObject({
        cliente_id: null,
        cliente_nome: "Seu Zé",
        situacao: "concluido",
        avulso: true,
        preco_centavos: 7000,
        forma_pagamento: "dinheiro",
      });
    });

    it("sem nome, vira 'Cliente avulso'", async () => {
      expect((await avulso(dono, corte, "pix")).cliente_nome).toBe("Cliente avulso");
    });

    it("não acende o sino do dono", async () => {
      await avulso(dono, corte, "pix");
      expect((await db.query("select * from public.alertas")).rows).toHaveLength(0);
    });

    it("não ocupa a agenda: o horário continua livre e um agendamento pode sobrepor", async () => {
      await avulso(dono, corte, "pix");
      const hoje = (
        await db.query<{ d: string }>(
          "select (now() at time zone 'America/Sao_Paulo')::date::text as d",
        )
      ).rows[0]!.d;
      const ocupados = await como(db, "anon", () =>
        db.query("select * from public.horarios_ocupados($1)", [hoje]),
      );
      expect(ocupados.rows).toHaveLength(0);
      // Um agendamento ativo no mesmo intervalo não é barrado pelo avulso.
      await db.query(
        `insert into public.agendamentos (cliente_id, cliente_nome, cliente_celular, servico_id,
           servico_nome, preco_centavos, duracao_minutos, inicio, fim)
         values ($1, 'Maria', '11999990001', $2, 'Serviço', 4500, 30,
           now() - interval '30 minutes', now())`,
        [maria, corte],
      );
    });

    it("só o dono registra, e o cliente não vê os avulsos", async () => {
      await expect(avulso(maria, corte, "pix")).rejects.toThrow(/sem_permissao/);
      await avulso(dono, corte, "pix");
      await como(db, maria, async () => {
        expect((await db.query("select * from public.agendamentos")).rows).toHaveLength(0);
      });
    });

    it("pede a forma de pagamento e recusa serviço inativo ou desconhecido", async () => {
      await expect(avulso(dono, corte, null)).rejects.toThrow(/forma_pagamento_obrigatoria/);
      await expect(avulso(dono, crypto.randomUUID(), "pix")).rejects.toThrow(
        /servico_indisponivel/,
      );
      await db.query("update public.servicos set ativo = false where id = $1", [corte]);
      await expect(avulso(dono, corte, "pix")).rejects.toThrow(/servico_indisponivel/);
      await db.query("update public.servicos set ativo = true where id = $1", [corte]);
    });

    it("o avulso é final: não muda de situação depois", async () => {
      const a = await avulso(dono, corte, "pix");
      await expect(
        como(db, dono, () => db.query("select public.mudar_situacao($1, 'cancelado')", [a.id])),
      ).rejects.toThrow(/transicao_invalida/);
    });
  });

  describe("caixa", () => {
    it("abre com o troco, e só um fica aberto por vez", async () => {
      const caixa = await abrir(5000);
      expect(caixa.valor_inicial_centavos).toBe(5000);
      expect(caixa.fechado_em).toBeNull();
      await expect(abrir(0)).rejects.toThrow(/caixa_ja_aberto/);
    });

    it("recusa valor negativo ao abrir e ao fechar, e fechar sem caixa aberto", async () => {
      await expect(abrir(-1)).rejects.toThrow(/valor_invalido/);
      await expect(fechar(0)).rejects.toThrow(/caixa_fechado/);
      await abrir(0);
      await expect(fechar(-1)).rejects.toThrow(/valor_invalido/);
    });

    it("cada pagamento entra no caixa que estava aberto; sem caixa, entra solto", async () => {
      const solto = await emAtendimento();
      await concluir(solto, "pix");
      const caixa = await abrir(0);
      const dentro = await emAtendimento();
      await concluir(dentro, "pix");
      const venda = await vender([{ produto_id: pente, quantidade: 1 }], "pix");
      const ids = await db.query<{ id: string; caixa_id: string | null }>(
        "select id, caixa_id from public.agendamentos union all select id, caixa_id from public.vendas",
      );
      const por = Object.fromEntries(ids.rows.map((r) => [r.id, r.caixa_id]));
      expect(por[solto]).toBeNull();
      expect(por[dentro]).toBe(caixa.id);
      expect(por[venda.id]).toBe(caixa.id);
    });

    it("o fechamento bate com a soma dos lançamentos: troco mais dinheiro, menos estorno", async () => {
      const caixa = await abrir(5000);
      await concluir(await emAtendimento(corte, 4500), "dinheiro"); // +45
      await concluir(await emAtendimento(corteBarba, 7000), "pix"); // pix: fora da gaveta
      const v1 = await vender([{ produto_id: maquina, quantidade: 1 }], "dinheiro"); // +189
      await vender([{ produto_id: pente, quantidade: 2 }], "credito"); // fora da gaveta
      await como(db, dono, () => db.query("select public.estornar_venda($1, 'defeito')", [v1.id])); // -189

      const r = await resumo(caixa.id);
      expect(r.esperado_centavos).toBe(5000 + 4500 + 18900 - 18900);
      expect(r.por_forma["dinheiro"]).toEqual({
        entradas_centavos: 4500 + 18900,
        estornos_centavos: 18900,
        quantidade: 2,
      });
      expect(r.por_forma["pix"]).toEqual({
        entradas_centavos: 7000,
        estornos_centavos: 0,
        quantidade: 1,
      });
      expect(r.por_forma["credito"]).toEqual({
        entradas_centavos: 5000,
        estornos_centavos: 0,
        quantidade: 1,
      });
      expect(r.por_forma["debito"]).toEqual({
        entradas_centavos: 0,
        estornos_centavos: 0,
        quantidade: 0,
      });

      // O que a tela soma dos lançamentos é o mesmo que o banco guarda no resumo.
      const livro = await como(db, dono, () =>
        db.query<{ forma_pagamento: string; valor_centavos: number }>(
          "select forma_pagamento, valor_centavos from public.lancamentos_do_caixa($1)",
          [caixa.id],
        ),
      );
      for (const forma of ["pix", "dinheiro", "debito", "credito"]) {
        const liquido = livro.rows
          .filter((l) => l.forma_pagamento === forma)
          .reduce((t, l) => t + l.valor_centavos, 0);
        const dele = r.por_forma[forma]!;
        expect(liquido).toBe(dele.entradas_centavos - dele.estornos_centavos);
      }
    });

    it("fechar guarda o contado, o esperado, a diferença e o resumo", async () => {
      const caixa = await abrir(5000);
      await concluir(await emAtendimento(corte, 4500), "dinheiro");
      const fechado = await fechar(9000, " faltou o troco da maquininha ");
      expect(fechado.id).toBe(caixa.id);
      expect(fechado.fechado_em).not.toBeNull();
      expect(fechado.esperado_centavos).toBe(9500);
      expect(fechado.valor_contado_centavos).toBe(9000);
      expect(fechado.diferenca_centavos).toBe(-500); // faltou
      expect(fechado.observacao).toBe("faltou o troco da maquininha");
      expect(fechado.resumo["dinheiro"]?.entradas_centavos).toBe(4500);
    });

    it("quando confere, a diferença é zero; quando sobra, é positiva", async () => {
      await abrir(1000);
      expect((await fechar(1000)).diferenca_centavos).toBe(0);
      await abrir(1000);
      expect((await fechar(1200)).diferenca_centavos).toBe(200);
    });

    it("depois de fechado o caixa não recebe mais nada, e o resumo dele não muda", async () => {
      const caixa = await abrir(0);
      await concluir(await emAtendimento(), "dinheiro");
      await fechar(4500);
      await concluir(await emAtendimento(), "dinheiro");
      const r = await resumo(caixa.id);
      expect(r.esperado_centavos).toBe(4500);
      const solto = await db.query<{ caixa_id: string | null }>(
        "select caixa_id from public.agendamentos where caixa_id is null",
      );
      expect(solto.rows).toHaveLength(1);
    });

    it("estorno feito depois do fechamento sai do caixa seguinte, e não do que já fechou", async () => {
      const primeiro = await abrir(0);
      const v = await vender([{ produto_id: pente, quantidade: 1 }], "dinheiro");
      await fechar(2500);
      const segundo = await abrir(2500);
      await como(db, dono, () => db.query("select public.estornar_venda($1)", [v.id]));
      expect((await resumo(primeiro.id)).esperado_centavos).toBe(2500);
      expect((await resumo(segundo.id)).esperado_centavos).toBe(0);
    });

    it("o estorno guarda quem, quando e por quê", async () => {
      const v = await vender([{ produto_id: pente, quantidade: 1 }], "pix");
      const { rows } = await como(db, dono, () =>
        db.query<{ estornada_por: string; estorno_motivo: string; estornada_em: string }>(
          "select * from public.estornar_venda($1, '  cliente devolveu ')",
          [v.id],
        ),
      );
      expect(rows[0]?.estornada_por).toBe(dono);
      expect(rows[0]?.estorno_motivo).toBe("cliente devolveu");
      expect(rows[0]?.estornada_em).not.toBeNull();
    });

    it("só o dono abre, fecha, resume e lê os caixas", async () => {
      const caixa = await abrir(0);
      await como(db, maria, async () => {
        await expect(db.query("select public.abrir_caixa(0)")).rejects.toThrow(/sem_permissao/);
        await expect(db.query("select public.fechar_caixa(0)")).rejects.toThrow(/sem_permissao/);
        await expect(db.query("select public.resumo_do_caixa($1)", [caixa.id])).rejects.toThrow(
          /sem_permissao/,
        );
        expect((await db.query("select * from public.caixas")).rows).toHaveLength(0);
        expect(
          (await db.query("select * from public.lancamentos_do_caixa($1)", [caixa.id])).rows,
        ).toHaveLength(0);
      });
      await como(db, "anon", async () => {
        await expect(db.query("select * from public.caixas")).rejects.toThrow(/permission denied/);
        await expect(db.query("select public.abrir_caixa(0)")).rejects.toThrow(/permission denied/);
        await expect(
          db.query("select public.registrar_atendimento_avulso($1, 'pix')", [corte]),
        ).rejects.toThrow(/permission denied/);
      });
    });

    it("não se escreve em caixas direto, só pelas funções", async () => {
      await como(db, dono, async () => {
        await expect(
          db.query("insert into public.caixas (valor_inicial_centavos) values (1)"),
        ).rejects.toThrow(/permission denied/);
        await expect(
          db.query("update public.caixas set valor_inicial_centavos = 1"),
        ).rejects.toThrow(/permission denied/);
      });
    });

    it("um caixa com lançamentos não pode ser apagado", async () => {
      const caixa = await abrir(0);
      await concluir(await emAtendimento(), "pix");
      await expect(db.query("delete from public.caixas where id = $1", [caixa.id])).rejects.toThrow(
        /foreign key/,
      );
    });
  });
});
