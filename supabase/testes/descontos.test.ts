// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  como,
  criarBanco,
  criarUsuario,
  diasAteDiaDaSemana,
  emSaoPaulo,
  idDoProduto,
  idDoServico,
  tornarDono,
  type Banco,
} from "./ambiente";

type Cupom = {
  id: string;
  codigo: string;
  tipo: string;
  valor: number;
  ativo: boolean;
};

type Agendamento = {
  id: string;
  situacao: string;
  preco_centavos: number;
  desconto_centavos: number;
  cupom_id: string | null;
  forma_pagamento: string | null;
  caixa_id: string | null;
  resgate_fidelidade: boolean;
};

describe("Cupons e fidelidade no banco", () => {
  let db: Banco;
  let dono: string;
  let maria: string;
  let joao: string;
  let corte: string; // 30 min, R$ 45
  let corteBarba: string; // 60 min, R$ 70
  let pente: string; // R$ 25

  const segunda = (hora: string) => emSaoPaulo(diasAteDiaDaSemana(1), hora);

  beforeAll(async () => {
    db = await criarBanco();
    dono = await criarUsuario(db, { nome: "Dono", celular: "11900000000" });
    await tornarDono(db, dono);
    maria = await criarUsuario(db, { nome: "Maria", celular: "11999990001" });
    joao = await criarUsuario(db, { nome: "João", celular: "11999990002" });
    corte = await idDoServico(db, "Corte clássico");
    corteBarba = await idDoServico(db, "Corte + barba");
    pente = await idDoProduto(db, "Pente profissional");
  });
  afterAll(() => db.close());

  beforeEach(async () => {
    await db.exec(`
      truncate public.caixas, public.agendamentos, public.vendas, public.cupons,
        public.fidelidade_movimentos, public.alertas cascade;
      update public.empresa set fidelidade_ativa = false, fidelidade_atendimentos = 10,
        fidelidade_servico_id = null;
    `);
  });

  // Cupons -------------------------------------------------------------------------------
  const criarCupom = (
    quem: string,
    codigo: string,
    tipo: string,
    valor: number,
    validoAte: string | null = null,
    limite: number | null = null,
  ) =>
    como(db, quem, async () => {
      const { rows } = await db.query<Cupom>(
        "select * from public.criar_cupom($1, $2, $3, $4, $5)",
        [codigo, tipo, valor, validoAte, limite],
      );
      return rows[0]!;
    });

  const prever = (quem: string | "anon", codigo: string, total: number) =>
    como(db, quem, async () => {
      const { rows } = await db.query<{ d: number }>("select public.prever_desconto($1, $2) as d", [
        codigo,
        total,
      ]);
      return rows[0]!.d;
    });

  const reservar = (quem: string, servico: string, inicio: string, cupom: string | null = null) =>
    como(db, quem, async () => {
      const { rows } = await db.query<Agendamento>(
        "select * from public.reservar($1, $2, '', $3)",
        [servico, inicio, cupom],
      );
      return rows[0]!;
    });

  let deslocamento = 0;
  // Atendimento em curso (inserido direto), cada um no próprio horário.
  async function emAtendimento(cliente: string | null, servico = corte, preco = 4500) {
    deslocamento += 1;
    const { rows } = await db.query<{ id: string }>(
      `insert into public.agendamentos (cliente_id, cliente_nome, cliente_celular, servico_id,
         servico_nome, preco_centavos, duracao_minutos, inicio, fim, situacao)
       values ($1, 'Cliente', '11999990001', $2, 'Serviço', $3, 30,
         now() - make_interval(hours => $4), now() - make_interval(hours => $4) + interval '30 minutes',
         'em_atendimento')
       returning id`,
      [cliente, servico, preco, deslocamento],
    );
    return rows[0]!.id;
  }

  const concluir = (
    id: string,
    forma: string | null = "pix",
    cupom: string | null = null,
    resgatar = false,
  ) =>
    como(db, dono, async () => {
      const { rows } = await db.query<Agendamento>(
        "select * from public.mudar_situacao($1, 'concluido', $2, $3, $4)",
        [id, forma, cupom, resgatar],
      );
      return rows[0]!;
    });

  const vender = (
    forma: string | null,
    cupom: string | null = null,
    desconto = 0,
    quantidade = 2,
  ) =>
    como(db, dono, async () => {
      const { rows } = await db.query<{
        id: string;
        total_centavos: number;
        desconto_centavos: number;
        cupom_id: string | null;
      }>("select * from public.registrar_venda($1::jsonb, $2, $3, now(), $4)", [
        JSON.stringify([{ produto_id: pente, quantidade }]),
        forma,
        desconto,
        cupom,
      ]);
      return rows[0]!;
    });

  describe("criar e listar cupons", () => {
    it("guarda o código em maiúsculas e sem espaços", async () => {
      const c = await criarCupom(dono, "  verao10 ", "percentual", 10);
      expect(c).toMatchObject({ codigo: "VERAO10", tipo: "percentual", valor: 10, ativo: true });
    });

    it("recusa código, valor, validade e limite inválidos", async () => {
      await expect(criarCupom(dono, "ab", "percentual", 10)).rejects.toThrow(
        /cupom_codigo_invalido/,
      );
      await expect(criarCupom(dono, "com espaço", "valor", 500)).rejects.toThrow(
        /cupom_codigo_invalido/,
      );
      await expect(criarCupom(dono, "BAD1", "percentual", 101)).rejects.toThrow(
        /cupom_valor_invalido/,
      );
      await expect(criarCupom(dono, "BAD2", "percentual", 0)).rejects.toThrow(
        /cupom_valor_invalido/,
      );
      await expect(criarCupom(dono, "BAD3", "valor", -5)).rejects.toThrow(/cupom_valor_invalido/);
      await expect(criarCupom(dono, "BAD4", "brinde", 5)).rejects.toThrow(/cupom_valor_invalido/);
      await expect(criarCupom(dono, "BAD5", "valor", 500, "2020-01-01T00:00:00Z")).rejects.toThrow(
        /cupom_validade_invalida/,
      );
      await expect(criarCupom(dono, "BAD6", "valor", 500, null, 0)).rejects.toThrow(
        /cupom_limite_invalido/,
      );
    });

    it("não repete o código, mesmo escrito de outro jeito", async () => {
      await criarCupom(dono, "PROMO", "valor", 500);
      await expect(criarCupom(dono, "promo ", "valor", 700)).rejects.toThrow(
        /cupom_codigo_repetido/,
      );
    });

    it("as restrições da tabela valem também para quem escreve direto", async () => {
      await expect(
        db.query(
          "insert into public.cupons (codigo, tipo, valor) values ('X100', 'percentual', 101)",
        ),
      ).rejects.toThrow(/check constraint/);
      await expect(
        db.query(
          "insert into public.cupons (codigo, tipo, valor) values ('minusculo', 'valor', 5)",
        ),
      ).rejects.toThrow(/check constraint/);
    });

    it("só o dono cria, liga e desliga, lista e lê cupons", async () => {
      const c = await criarCupom(dono, "SOUDONO", "valor", 500);
      await expect(criarCupom(maria, "DAMARIA", "valor", 500)).rejects.toThrow(/sem_permissao/);
      await como(db, maria, async () => {
        await expect(
          db.query("select public.mudar_cupom_ativo($1, false)", [c.id]),
        ).rejects.toThrow(/sem_permissao/);
        expect((await db.query("select * from public.listar_cupons()")).rows).toHaveLength(0);
        expect((await db.query("select * from public.cupons")).rows).toHaveLength(0);
        await expect(
          db.query("insert into public.cupons (codigo, tipo, valor) values ('ABC', 'valor', 1)"),
        ).rejects.toThrow(/permission denied/);
      });
      await como(db, "anon", async () => {
        await expect(db.query("select * from public.cupons")).rejects.toThrow(/permission denied/);
        await expect(db.query("select * from public.listar_cupons()")).rejects.toThrow(
          /permission denied/,
        );
      });
    });

    it("lista com usos e situação; desligar o cupom o tira de uso", async () => {
      const c = await criarCupom(dono, "LISTA", "percentual", 10, null, 1);
      const lista = () =>
        como(
          db,
          dono,
          async () =>
            (
              await db.query<{ codigo: string; usos: number; situacao: string }>(
                "select codigo, usos, situacao from public.listar_cupons()",
              )
            ).rows,
        );
      expect(await lista()).toEqual([{ codigo: "LISTA", usos: 0, situacao: "ativo" }]);
      await reservar(maria, corte, segunda("10:00"), "LISTA");
      expect(await lista()).toEqual([{ codigo: "LISTA", usos: 1, situacao: "esgotado" }]);
      await como(db, dono, () => db.query("select public.mudar_cupom_ativo($1, false)", [c.id]));
      expect((await lista())[0]?.situacao).toBe("inativo");
      await expect(
        como(db, dono, () =>
          db.query("select public.mudar_cupom_ativo($1, true)", [crypto.randomUUID()]),
        ),
      ).rejects.toThrow(/cupom_inexistente/);
    });
  });

  describe("prever o desconto", () => {
    it("percentual arredonda para baixo; valor fixo é o valor", async () => {
      await criarCupom(dono, "DEZ", "percentual", 10);
      await criarCupom(dono, "DEZREAIS", "valor", 1000);
      expect(await prever(maria, "DEZ", 4500)).toBe(450);
      expect(await prever(maria, "dez", 4599)).toBe(459); // 459,9 vira 459
      expect(await prever(maria, "DEZREAIS", 4500)).toBe(1000);
    });

    it("nunca passa do total: valor maior que o serviço e 100% abatem só o total", async () => {
      await criarCupom(dono, "GRANDE", "valor", 100000);
      await criarCupom(dono, "TUDO", "percentual", 100);
      expect(await prever(maria, "GRANDE", 4500)).toBe(4500);
      expect(await prever(maria, "TUDO", 4500)).toBe(4500);
      expect(await prever(maria, "GRANDE", 0)).toBe(0);
    });

    it("explica por que o cupom não vale", async () => {
      await expect(prever(maria, "NAOEXISTE", 4500)).rejects.toThrow(/cupom_invalido/);

      const desligado = await criarCupom(dono, "DESLIGADO", "valor", 500);
      await como(db, dono, () =>
        db.query("select public.mudar_cupom_ativo($1, false)", [desligado.id]),
      );
      await expect(prever(maria, "DESLIGADO", 4500)).rejects.toThrow(/cupom_invalido/);

      await criarCupom(dono, "VENCEU", "valor", 500, "2099-01-01T00:00:00Z");
      await db.query(
        "update public.cupons set valido_ate = now() - interval '1 minute' where codigo = 'VENCEU'",
      );
      await expect(prever(maria, "VENCEU", 4500)).rejects.toThrow(/cupom_vencido/);

      await criarCupom(dono, "UNICO", "valor", 500, null, 1);
      await reservar(joao, corte, segunda("10:00"), "UNICO");
      await expect(prever(maria, "UNICO", 4500)).rejects.toThrow(/cupom_esgotado/);
    });

    it("pede login e um total válido", async () => {
      await criarCupom(dono, "LOGIN", "valor", 500);
      await expect(prever("anon", "LOGIN", 4500)).rejects.toThrow(/permission denied/);
      await expect(prever(maria, "LOGIN", -1)).rejects.toThrow(/valor_invalido/);
    });

    it("não grava nada", async () => {
      await criarCupom(dono, "SOOLHAR", "valor", 500, null, 1);
      await prever(maria, "SOOLHAR", 4500);
      await prever(maria, "SOOLHAR", 4500);
      expect(await prever(maria, "SOOLHAR", 4500)).toBe(500);
    });
  });

  describe("reservar com cupom", () => {
    it("guarda o cupom e o desconto; o preço do serviço continua o mesmo", async () => {
      const c = await criarCupom(dono, "PRIMEIRA", "percentual", 20);
      const a = await reservar(maria, corteBarba, segunda("10:00"), "primeira");
      expect(a).toMatchObject({ preco_centavos: 7000, desconto_centavos: 1400, cupom_id: c.id });
    });

    it("sem cupom, sem desconto", async () => {
      const a = await reservar(maria, corte, segunda("10:00"));
      expect(a).toMatchObject({ desconto_centavos: 0, cupom_id: null });
    });

    it("cupom inválido barra a reserva inteira", async () => {
      await expect(reservar(maria, corte, segunda("10:00"), "FANTASMA")).rejects.toThrow(
        /cupom_invalido/,
      );
      expect((await db.query("select * from public.agendamentos")).rows).toHaveLength(0);
    });

    it("respeita o limite de usos, e cancelar devolve o uso", async () => {
      await criarCupom(dono, "SOUM", "valor", 500, null, 1);
      const a = await reservar(maria, corte, segunda("10:00"), "SOUM");
      await expect(reservar(joao, corte, segunda("11:00"), "SOUM")).rejects.toThrow(
        /cupom_esgotado/,
      );
      await como(db, maria, () => db.query("select public.cancelar_agendamento($1)", [a.id]));
      const outra = await reservar(joao, corte, segunda("11:00"), "SOUM");
      expect(outra.desconto_centavos).toBe(500);
    });

    it("o desconto de um atendimento nunca passa do preço, nem escrevendo direto", async () => {
      await criarCupom(dono, "ENORME", "valor", 99999);
      const a = await reservar(maria, corte, segunda("10:00"), "ENORME");
      expect(a.desconto_centavos).toBe(4500);
      await expect(
        db.query("update public.agendamentos set desconto_centavos = 4501 where id = $1", [a.id]),
      ).rejects.toThrow(/check constraint/);
    });
  });

  describe("concluir um atendimento com desconto", () => {
    it("o dono aplica o cupom na hora de cobrar; o caixa soma o valor cobrado", async () => {
      await criarCupom(dono, "BALCAO", "percentual", 10);
      const caixa = await como(
        db,
        dono,
        async () =>
          (await db.query<{ id: string }>("select * from public.abrir_caixa(0)")).rows[0]!,
      );
      const id = await emAtendimento(maria);
      const a = await concluir(id, "dinheiro", "balcao");
      expect(a).toMatchObject({
        desconto_centavos: 450,
        situacao: "concluido",
        caixa_id: caixa.id,
      });
      const { rows } = await como(db, dono, () =>
        db.query<{ r: { esperado_centavos: number } }>("select public.resumo_do_caixa($1) as r", [
          caixa.id,
        ]),
      );
      expect(rows[0]!.r.esperado_centavos).toBe(4050);
    });

    it("mantém o cupom da reserva e não deixa trocar por outro", async () => {
      await criarCupom(dono, "RESERVA", "valor", 500);
      await criarCupom(dono, "OUTRO", "valor", 900);
      const a = await reservar(maria, corte, segunda("10:00"), "RESERVA");
      await db.query("update public.agendamentos set situacao = 'em_atendimento' where id = $1", [
        a.id,
      ]);
      await expect(concluir(a.id, "pix", "OUTRO")).rejects.toThrow(/cupom_ja_aplicado/);
      const feito = await concluir(a.id, "pix");
      expect(feito.desconto_centavos).toBe(500);
    });

    it("cupom que cobre tudo dispensa a forma de pagamento e o caixa", async () => {
      await criarCupom(dono, "GRATIS", "percentual", 100);
      const id = await emAtendimento(maria);
      const a = await concluir(id, null, "GRATIS");
      expect(a).toMatchObject({ desconto_centavos: 4500, forma_pagamento: null, caixa_id: null });
    });

    it("com valor a cobrar, a forma de pagamento continua obrigatória", async () => {
      await criarCupom(dono, "PARCIAL", "valor", 500);
      const id = await emAtendimento(maria);
      await expect(concluir(id, null, "PARCIAL")).rejects.toThrow(/forma_pagamento_obrigatoria/);
      const { rows } = await db.query<{ situacao: string }>(
        "select situacao from public.agendamentos where id = $1",
        [id],
      );
      expect(rows[0]?.situacao).toBe("em_atendimento");
    });

    it("cupom inválido barra a conclusão", async () => {
      const id = await emAtendimento(maria);
      await expect(concluir(id, "pix", "FANTASMA")).rejects.toThrow(/cupom_invalido/);
    });
  });

  describe("venda com cupom", () => {
    it("abate do total da venda, em centavos", async () => {
      const c = await criarCupom(dono, "PENTE", "percentual", 10);
      const v = await vender("pix", "pente"); // 2 x R$ 25
      expect(v).toMatchObject({ total_centavos: 4500, desconto_centavos: 500, cupom_id: c.id });
    });

    it("não soma com desconto manual", async () => {
      await criarCupom(dono, "JUNTO", "valor", 500);
      await expect(vender("pix", "JUNTO", 100)).rejects.toThrow(/desconto_duplicado/);
      expect((await db.query("select * from public.vendas")).rows).toHaveLength(0);
    });

    it("o estorno devolve o uso do cupom", async () => {
      await criarCupom(dono, "UMAVEZ", "valor", 500, null, 1);
      const v = await vender("pix", "UMAVEZ");
      await expect(vender("pix", "UMAVEZ")).rejects.toThrow(/cupom_esgotado/);
      await como(db, dono, () => db.query("select public.estornar_venda($1)", [v.id]));
      await expect(vender("pix", "UMAVEZ")).resolves.toMatchObject({ desconto_centavos: 500 });
    });

    it("cupom grande demais não deixa a venda negativa", async () => {
      await criarCupom(dono, "ENORME2", "valor", 99999);
      expect(await vender("pix", "ENORME2")).toMatchObject({
        total_centavos: 0,
        desconto_centavos: 5000,
      });
    });
  });

  // Fidelidade ---------------------------------------------------------------------------
  const configurar = (quem: string, ativa: boolean, n: number, servico: string | null) =>
    como(db, quem, () =>
      db.query("select public.salvar_fidelidade($1, $2, $3)", [ativa, n, servico]),
    );

  const saldo = (quem: string, de: string | null = null) =>
    como(db, quem, async () => {
      const { rows } = await db.query<{ s: number }>("select public.saldo_de_fidelidade($1) as s", [
        de,
      ]);
      return rows[0]!.s;
    });

  describe("configurar o cartão fidelidade", () => {
    it("só o dono configura, e ligar exige o serviço do brinde", async () => {
      await expect(configurar(maria, true, 5, corte)).rejects.toThrow(/sem_permissao/);
      await expect(configurar(dono, true, 5, null)).rejects.toThrow(/fidelidade_incompleta/);
      await expect(configurar(dono, false, 1, corte)).rejects.toThrow(/fidelidade_invalida/);
      await expect(configurar(dono, false, 101, corte)).rejects.toThrow(/fidelidade_invalida/);
      await expect(configurar(dono, true, 5, crypto.randomUUID())).rejects.toThrow(
        /servico_indisponivel/,
      );
      await configurar(dono, true, 5, corte);
      const { rows } = await db.query(
        "select fidelidade_ativa, fidelidade_atendimentos, fidelidade_servico_id from public.empresa",
      );
      expect(rows[0]).toEqual({
        fidelidade_ativa: true,
        fidelidade_atendimentos: 5,
        fidelidade_servico_id: corte,
      });
    });

    it("escrevendo direto, não se liga a fidelidade sem o serviço", async () => {
      await expect(
        db.query("update public.empresa set fidelidade_ativa = true, fidelidade_servico_id = null"),
      ).rejects.toThrow(/check constraint/);
    });
  });

  describe("pontos", () => {
    it("com o programa desligado, ninguém ganha ponto", async () => {
      await concluir(await emAtendimento(maria));
      expect(await saldo(maria)).toBe(0);
    });

    it("cada atendimento concluído rende um ponto", async () => {
      await configurar(dono, true, 5, corte);
      await concluir(await emAtendimento(maria));
      await concluir(await emAtendimento(maria));
      await concluir(await emAtendimento(joao));
      expect(await saldo(maria)).toBe(2);
      expect(await saldo(joao)).toBe(1);
    });

    it("cancelado e falta não rendem ponto; avulso, sem conta, também não", async () => {
      await configurar(dono, true, 5, corte);
      const a = await reservar(maria, corte, segunda("10:00"));
      await como(db, maria, () => db.query("select public.cancelar_agendamento($1)", [a.id]));
      const b = await emAtendimento(maria);
      await db.query(
        "update public.agendamentos set inicio = now() - interval '5 hours', fim = now() - interval '4 hours 30 minutes', situacao = 'confirmado' where id = $1",
        [b],
      );
      await como(db, dono, () =>
        db.query("select public.mudar_situacao($1, 'nao_compareceu')", [b]),
      );
      await como(db, dono, () =>
        db.query("select public.registrar_atendimento_avulso($1, 'pix')", [corte]),
      );
      expect(await saldo(maria)).toBe(0);
      expect((await db.query("select * from public.fidelidade_movimentos")).rows).toHaveLength(0);
    });

    it("o cliente vê o próprio saldo; o dono, o de qualquer um; visitante, nenhum", async () => {
      await configurar(dono, true, 5, corte);
      await concluir(await emAtendimento(maria));
      expect(await saldo(maria)).toBe(1);
      expect(await saldo(maria, maria)).toBe(1);
      expect(await saldo(joao)).toBe(0);
      await expect(saldo(joao, maria)).rejects.toThrow(/sem_permissao/);
      expect(await saldo(dono, maria)).toBe(1);
      await expect(saldo("anon")).rejects.toThrow(/permission denied/);
    });

    it("cada um lê só os próprios movimentos, e ninguém escreve neles", async () => {
      await configurar(dono, true, 5, corte);
      await concluir(await emAtendimento(maria));
      await concluir(await emAtendimento(joao));
      await como(db, maria, async () => {
        const { rows } = await db.query<{ cliente_id: string }>(
          "select cliente_id from public.fidelidade_movimentos",
        );
        expect(rows.map((r) => r.cliente_id)).toEqual([maria]);
        await expect(
          db.query(
            "insert into public.fidelidade_movimentos (cliente_id, pontos, motivo) values ($1, 50, 'atendimento')",
            [maria],
          ),
        ).rejects.toThrow(/permission denied/);
        await expect(
          db.query("update public.fidelidade_movimentos set pontos = 99"),
        ).rejects.toThrow(/permission denied/);
      });
      await como(db, dono, async () => {
        expect((await db.query("select * from public.fidelidade_movimentos")).rows).toHaveLength(2);
      });
      await como(db, "anon", async () => {
        await expect(db.query("select * from public.fidelidade_movimentos")).rejects.toThrow(
          /permission denied/,
        );
      });
    });

    it("um atendimento rende no máximo um ponto", async () => {
      await configurar(dono, true, 5, corte);
      const id = await emAtendimento(maria);
      await concluir(id);
      await expect(
        db.query(
          "insert into public.fidelidade_movimentos (cliente_id, pontos, motivo, agendamento_id) values ($1, 1, 'atendimento', $2)",
          [maria, id],
        ),
      ).rejects.toThrow(/duplicate key/);
    });

    it("excluir a conta apaga os pontos", async () => {
      await configurar(dono, true, 5, corte);
      const ana = await criarUsuario(db, { nome: "Ana", celular: "11999990003" });
      await concluir(await emAtendimento(ana));
      expect((await db.query("select * from public.fidelidade_movimentos")).rows).toHaveLength(1);
      await como(db, ana, () => db.query("select public.excluir_minha_conta()"));
      expect((await db.query("select * from public.fidelidade_movimentos")).rows).toHaveLength(0);
    });
  });

  describe("resgatar o serviço grátis", () => {
    async function ganharPontos(cliente: string, quantos: number) {
      for (let i = 0; i < quantos; i++) await concluir(await emAtendimento(cliente));
    }

    it("com saldo suficiente, o serviço sai de graça e gasta os pontos", async () => {
      await configurar(dono, true, 3, corte);
      await ganharPontos(maria, 3);
      expect(await saldo(maria)).toBe(3);
      const id = await emAtendimento(maria);
      const a = await concluir(id, null, null, true);
      expect(a).toMatchObject({
        desconto_centavos: 4500,
        resgate_fidelidade: true,
        forma_pagamento: null,
        caixa_id: null,
      });
      // Gastou 3 e o atendimento do prêmio não rende ponto.
      expect(await saldo(maria)).toBe(0);
    });

    it("sem pontos suficientes, o resgate é recusado e nada muda", async () => {
      await configurar(dono, true, 3, corte);
      await ganharPontos(maria, 2);
      const id = await emAtendimento(maria);
      await expect(concluir(id, null, null, true)).rejects.toThrow(/saldo_insuficiente/);
      const { rows } = await db.query<{ situacao: string }>(
        "select situacao from public.agendamentos where id = $1",
        [id],
      );
      expect(rows[0]?.situacao).toBe("em_atendimento");
      expect(await saldo(maria)).toBe(2);
    });

    it("só vale para o serviço escolhido, com o programa ligado e para quem tem conta", async () => {
      await configurar(dono, true, 2, corte);
      await ganharPontos(maria, 2);
      const outro = await emAtendimento(maria, corteBarba, 7000);
      await expect(concluir(outro, null, null, true)).rejects.toThrow(
        /servico_do_resgate_invalido/,
      );

      const semConta = await emAtendimento(null);
      await expect(concluir(semConta, null, null, true)).rejects.toThrow(/fidelidade_sem_cliente/);

      await configurar(dono, false, 2, corte);
      const certo = await emAtendimento(maria);
      await expect(concluir(certo, null, null, true)).rejects.toThrow(/fidelidade_inativa/);
    });

    it("não se soma com cupom, nem o da hora nem o da reserva", async () => {
      await configurar(dono, true, 2, corte);
      await criarCupom(dono, "SOMA", "valor", 500);
      await ganharPontos(maria, 2);
      const id = await emAtendimento(maria);
      await expect(concluir(id, null, "SOMA", true)).rejects.toThrow(/desconto_duplicado/);

      const reservado = await reservar(maria, corte, segunda("10:00"), "SOMA");
      await db.query("update public.agendamentos set situacao = 'em_atendimento' where id = $1", [
        reservado.id,
      ]);
      await expect(concluir(reservado.id, null, null, true)).rejects.toThrow(/desconto_duplicado/);
      expect(await saldo(maria)).toBe(2);
    });

    it("o saldo que sobra continua valendo para o próximo resgate", async () => {
      await configurar(dono, true, 2, corte);
      await ganharPontos(maria, 5);
      await concluir(await emAtendimento(maria), null, null, true);
      expect(await saldo(maria)).toBe(3);
      await concluir(await emAtendimento(maria), null, null, true);
      expect(await saldo(maria)).toBe(1);
      await expect(concluir(await emAtendimento(maria), null, null, true)).rejects.toThrow(
        /saldo_insuficiente/,
      );
    });
  });
});
