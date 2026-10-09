// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { como, criarBanco, criarUsuario, idDoServico, tornarDono, type Banco } from "./ambiente";

type Avaliacao = {
  id: string;
  nota: number;
  comentario: string;
  autor_nome: string;
  publicada: boolean;
  cliente_id: string | null;
};

describe("Avaliações no banco", () => {
  let db: Banco;
  let dono: string;
  let maria: string;
  let joao: string;
  let corte: string;

  beforeAll(async () => {
    db = await criarBanco();
    dono = await criarUsuario(db, { nome: "Dono", celular: "11900000000" });
    await tornarDono(db, dono);
    maria = await criarUsuario(db, { nome: "Maria Souza Lima", celular: "11999990001" });
    joao = await criarUsuario(db, { nome: "João", celular: "11999990002" });
    corte = await idDoServico(db, "Corte clássico");
  });
  afterAll(() => db.close());

  beforeEach(async () => {
    await db.exec("truncate public.agendamentos, public.alertas cascade");
  });

  let deslocamento = 0;
  async function atendimento(cliente: string | null, situacao = "concluido") {
    deslocamento += 1;
    const { rows } = await db.query<{ id: string }>(
      `insert into public.agendamentos (cliente_id, cliente_nome, cliente_celular, servico_id,
         servico_nome, preco_centavos, duracao_minutos, inicio, fim, situacao)
       values ($1, 'Cliente', '11999990001', $2, 'Corte clássico', 4500, 30,
         now() - make_interval(hours => $3), now() - make_interval(hours => $3) + interval '30 minutes', $4)
       returning id`,
      [cliente, corte, deslocamento, situacao],
    );
    return rows[0]!.id;
  }

  const avaliar = (quem: string | "anon", id: string, nota: number, comentario = "") =>
    como(db, quem, async () => {
      const { rows } = await db.query<Avaliacao>("select * from public.avaliar($1, $2, $3)", [
        id,
        nota,
        comentario,
      ]);
      return rows[0]!;
    });

  const publicas = (quem: string | "anon" = "anon") =>
    como(db, quem, async () => {
      const { rows } = await db.query<{ nota: number; comentario: string; autor_nome: string }>(
        "select nota, comentario, autor_nome from public.avaliacoes_publicas()",
      );
      return rows;
    });

  it("avalia um atendimento concluído, com o nome abreviado", async () => {
    const id = await atendimento(maria);
    const av = await avaliar(maria, id, 5, "  Ótimo corte!  ");
    expect(av).toMatchObject({
      nota: 5,
      comentario: "Ótimo corte!",
      autor_nome: "Maria L.",
      publicada: true,
      cliente_id: maria,
    });
  });

  it("nome único fica como está", async () => {
    const id = await atendimento(joao);
    expect((await avaliar(joao, id, 4)).autor_nome).toBe("João");
  });

  it("só avalia o próprio atendimento, e só depois de concluído", async () => {
    const meu = await atendimento(maria);
    await expect(avaliar(joao, meu, 5)).rejects.toThrow(/agendamento_inexistente/);
    const marcado = await atendimento(maria, "agendado");
    await expect(avaliar(maria, marcado, 5)).rejects.toThrow(/avaliacao_indisponivel/);
    const cancelado = await atendimento(maria, "cancelado");
    await expect(avaliar(maria, cancelado, 5)).rejects.toThrow(/avaliacao_indisponivel/);
    await expect(avaliar(maria, crypto.randomUUID(), 5)).rejects.toThrow(/agendamento_inexistente/);
  });

  it("uma avaliação por atendimento", async () => {
    const id = await atendimento(maria);
    await avaliar(maria, id, 5);
    await expect(avaliar(maria, id, 1)).rejects.toThrow(/ja_avaliado/);
  });

  it("nota de 1 a 5 e comentário de até 500 caracteres", async () => {
    const id = await atendimento(maria);
    await expect(avaliar(maria, id, 0)).rejects.toThrow(/nota_invalida/);
    await expect(avaliar(maria, id, 6)).rejects.toThrow(/nota_invalida/);
    await expect(avaliar(maria, id, 5, "x".repeat(501))).rejects.toThrow(/comentario_longo/);
    await expect(avaliar(maria, id, 5, "x".repeat(500))).resolves.toMatchObject({ nota: 5 });
  });

  it("visitante não avalia", async () => {
    const id = await atendimento(maria);
    await expect(avaliar("anon", id, 5)).rejects.toThrow(/permission denied/);
  });

  it("o dono é avisado pelo sino", async () => {
    const id = await atendimento(maria);
    await avaliar(maria, id, 1);
    const { rows } = await db.query<{ tipo: string; texto: string }>(
      "select tipo, texto from public.alertas where tipo = 'nova_avaliacao'",
    );
    expect(rows).toEqual([
      { tipo: "nova_avaliacao", texto: "Maria L. avaliou Corte clássico com 1 estrela." },
    ]);
  });

  describe("o que o público vê", () => {
    it("só as publicadas, sem identificar a conta, e o visitante lê", async () => {
      const a = await atendimento(maria);
      const b = await atendimento(joao);
      await avaliar(maria, a, 5, "Gostei");
      const oculta = await avaliar(joao, b, 2, "Demorou");
      await como(db, dono, () =>
        db.query("select public.moderar_avaliacao($1, false)", [oculta.id]),
      );
      const lista = await publicas();
      expect(lista).toEqual([{ nota: 5, comentario: "Gostei", autor_nome: "Maria L." }]);
      expect(JSON.stringify(lista)).not.toContain(maria);
    });

    it("resume a média e o total só das publicadas", async () => {
      const a = await atendimento(maria);
      const b = await atendimento(joao);
      await avaliar(maria, a, 5);
      const dois = await avaliar(joao, b, 2);
      const resumo = () =>
        como(
          db,
          "anon",
          async () =>
            (
              await db.query<{ media: string; total: number }>(
                "select * from public.resumo_das_avaliacoes()",
              )
            ).rows[0]!,
        );
      expect(await resumo()).toEqual({ media: "3.5", total: 2 });
      await como(db, dono, () => db.query("select public.moderar_avaliacao($1, false)", [dois.id]));
      expect(await resumo()).toEqual({ media: "5.0", total: 1 });
    });

    it("sem avaliações, total zero e média nula", async () => {
      const r = await como(
        db,
        "anon",
        async () =>
          (
            await db.query<{ media: string | null; total: number }>(
              "select * from public.resumo_das_avaliacoes()",
            )
          ).rows[0]!,
      );
      expect(r).toEqual({ media: null, total: 0 });
    });

    it("o visitante não lê a tabela", async () => {
      await como(db, "anon", async () => {
        await expect(db.query("select * from public.avaliacoes")).rejects.toThrow(
          /permission denied/,
        );
      });
    });
  });

  describe("moderação e privacidade", () => {
    it("só o dono oculta; ocultar e voltar a publicar não apaga nada", async () => {
      const id = await atendimento(maria);
      const av = await avaliar(maria, id, 3);
      await expect(
        como(db, maria, () => db.query("select public.moderar_avaliacao($1, false)", [av.id])),
      ).rejects.toThrow(/sem_permissao/);
      await como(db, dono, () => db.query("select public.moderar_avaliacao($1, false)", [av.id]));
      expect(await publicas()).toHaveLength(0);
      await como(db, dono, () => db.query("select public.moderar_avaliacao($1, true)", [av.id]));
      expect(await publicas()).toHaveLength(1);
      await expect(
        como(db, dono, () =>
          db.query("select public.moderar_avaliacao($1, true)", [crypto.randomUUID()]),
        ),
      ).rejects.toThrow(/avaliacao_inexistente/);
    });

    it("cada cliente lê só as próprias; o dono lê todas; ninguém escreve direto", async () => {
      await avaliar(maria, await atendimento(maria), 5);
      await avaliar(joao, await atendimento(joao), 4);
      await como(db, maria, async () => {
        const { rows } = await db.query<{ cliente_id: string }>(
          "select cliente_id from public.avaliacoes",
        );
        expect(rows.map((r) => r.cliente_id)).toEqual([maria]);
        await expect(db.query("update public.avaliacoes set nota = 1")).rejects.toThrow(
          /permission denied/,
        );
        await expect(db.query("delete from public.avaliacoes")).rejects.toThrow(
          /permission denied/,
        );
      });
      await como(db, dono, async () => {
        expect((await db.query("select * from public.avaliacoes")).rows).toHaveLength(2);
      });
    });

    it("excluir a conta apaga as avaliações da pessoa", async () => {
      const ana = await criarUsuario(db, { nome: "Ana Paula", celular: "11999990003" });
      await avaliar(ana, await atendimento(ana), 5, "Meu telefone é 11 99999-0000");
      await como(db, ana, () => db.query("select public.excluir_minha_conta()"));
      expect((await db.query("select * from public.avaliacoes")).rows).toHaveLength(0);
      expect(await publicas()).toHaveLength(0);
    });
  });
});
