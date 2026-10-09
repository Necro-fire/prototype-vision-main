// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  como,
  criarBanco,
  criarUsuario,
  diasAteDiaDaSemana,
  emSaoPaulo,
  idDoServico,
  tornarDono,
  type Banco,
} from "./ambiente";

type Email = {
  id: string;
  destinatario: string;
  modelo: string;
  dados: Record<string, string | null>;
  enviar_em: string;
  enviado_em: string | null;
  tentativas: number;
  erro: string | null;
  agendamento_id: string | null;
};

describe("E-mails do cliente (fila no banco)", () => {
  let db: Banco;
  let dono: string;
  let maria: string;
  let corte: string;

  // Três dias à frente ou mais, numa segunda: o lembrete da véspera (18h) ainda está no futuro.
  const diaDaSegunda = diasAteDiaDaSemana(1, 3);
  const segunda = (hora: string) => emSaoPaulo(diaDaSegunda, hora);
  const vesperaDaSegunda = emSaoPaulo(diaDaSegunda - 1, "18:00");

  beforeAll(async () => {
    db = await criarBanco();
    dono = await criarUsuario(db, { nome: "Dono", celular: "11900000000" });
    await tornarDono(db, dono);
    maria = await criarUsuario(db, { nome: "Maria", celular: "11999990001" });
    corte = await idDoServico(db, "Corte clássico");
  });
  afterAll(() => db.close());

  beforeEach(async () => {
    await db.exec(`
      truncate public.agendamentos, public.alertas, public.emails_fila cascade;
      update public.perfis set lembretes_por_email = true;
    `);
  });

  const reservar = (inicio: string) =>
    como(db, maria, async () => {
      const r = await db.query<{ id: string }>("select * from public.reservar($1, $2, '')", [
        corte,
        inicio,
      ]);
      return r.rows[0]!.id;
    });

  const fila = async (modelo?: string) =>
    (
      await db.query<Email>(
        `select id, destinatario, modelo, dados, enviar_em::text as enviar_em,
                enviado_em::text as enviado_em, tentativas, erro, agendamento_id
         from public.emails_fila
         where $1::text is null or modelo = $1
         order by criado_em, modelo`,
        [modelo ?? null],
      )
    ).rows;

  const quando = async (iso: string) =>
    (await db.query<{ t: number }>("select extract(epoch from $1::timestamptz) as t", [iso]))
      .rows[0]!.t;
  const instante = async (texto: string) =>
    (await db.query<{ t: number }>("select extract(epoch from $1::timestamptz) as t", [texto]))
      .rows[0]!.t;

  // Papel do envio: só chama as funções da fila.
  const comoEnvio = async <T>(fn: () => Promise<T>): Promise<T> => {
    await db.exec("set role service_role");
    try {
      return await fn();
    } finally {
      await db.exec("reset role");
    }
  };
  const reservarEmails = (limite = 20) =>
    comoEnvio(
      async () =>
        (await db.query<Email>("select * from public.emails_reservar($1)", [limite])).rows,
    );
  const falhar = (id: string, erro = "Resend fora do ar") =>
    comoEnvio(() => db.query("select public.email_falhou($1, $2)", [id, erro]));
  const enviar = (id: string) => comoEnvio(() => db.query("select public.email_enviado($1)", [id]));
  const vencerTudo = () =>
    db.exec(
      "update public.emails_fila set enviar_em = now() - interval '1 minute' where enviado_em is null",
    );

  describe("quando o cliente agenda", () => {
    it("enfileira a confirmação, para o e-mail da conta, com o que o texto precisa", async () => {
      const id = await reservar(segunda("09:00"));
      const [confirmacao] = await fila("confirmacao");
      expect(confirmacao).toMatchObject({
        destinatario: `${maria}@teste.local`,
        modelo: "confirmacao",
        agendamento_id: id,
        enviado_em: null,
        tentativas: 0,
      });
      expect(confirmacao!.dados).toMatchObject({
        cliente_nome: "Maria",
        servico: "Corte clássico",
        fuso: "America/Sao_Paulo",
        barbearia: "ON-STYLE",
      });
      expect(await instante(confirmacao!.dados["inicio"]!)).toBe(await quando(segunda("09:00")));
    });

    it("agenda o lembrete para as 18h da véspera, no fuso da barbearia", async () => {
      await reservar(segunda("09:00"));
      const [lembrete] = await fila("lembrete");
      expect(lembrete).toBeDefined();
      expect(await instante(lembrete!.enviar_em)).toBe(await quando(vesperaDaSegunda));
    });

    it("não cria lembrete se a véspera às 18h já passou", async () => {
      // Direto no banco, como superusuário: um horário daqui a duas horas.
      await db.query(
        `insert into public.agendamentos (cliente_id, cliente_nome, cliente_celular, servico_id,
           servico_nome, preco_centavos, duracao_minutos, inicio, fim)
         values ($1, 'Maria', '11999990001', $2, 'Corte clássico', 5000, 30,
           now() + interval '2 hours', now() + interval '2 hours 30 minutes')`,
        [maria, corte],
      );
      expect(await fila("confirmacao")).toHaveLength(1);
      expect(await fila("lembrete")).toHaveLength(0);
    });

    it("não enfileira nada para agendamento sem conta (cliente removido)", async () => {
      await db.query(
        `insert into public.agendamentos (cliente_id, cliente_nome, cliente_celular, servico_id,
           servico_nome, preco_centavos, duracao_minutos, inicio, fim)
         values (null, 'Cliente removido', '', $1, 'Corte clássico', 5000, 30,
           now() + interval '5 days', now() + interval '5 days 30 minutes')`,
        [corte],
      );
      expect(await fila()).toHaveLength(0);
    });
  });

  describe("quando o horário muda", () => {
    it("remarcar avisa o cliente, troca o lembrete e guarda o horário anterior", async () => {
      const id = await reservar(segunda("09:00"));
      const novoInicio = segunda("14:00");
      await como(db, maria, () =>
        db.query("select * from public.remarcar($1, $2)", [id, novoInicio]),
      );

      const [remarcacao] = await fila("remarcacao");
      expect(remarcacao!.dados["inicio"]).toBeDefined();
      expect(await instante(remarcacao!.dados["inicio"]!)).toBe(await quando(novoInicio));
      expect(await instante(remarcacao!.dados["inicio_anterior"]!)).toBe(
        await quando(segunda("09:00")),
      );
      // Um lembrete só, e para o horário novo.
      expect(await fila("lembrete")).toHaveLength(1);
    });

    it("remarcar para outro dia leva o lembrete para a véspera do dia novo", async () => {
      const id = await reservar(segunda("09:00"));
      const terca = emSaoPaulo(diaDaSegunda + 1, "10:00");
      await como(db, maria, () => db.query("select * from public.remarcar($1, $2)", [id, terca]));
      const [lembrete] = await fila("lembrete");
      expect(await instante(lembrete!.enviar_em)).toBe(await quando(segunda("18:00")));
    });

    it("quando o dono confirma, não sai e-mail novo e o lembrete continua", async () => {
      const id = await reservar(segunda("09:00"));
      await como(db, dono, () =>
        db.query("select * from public.mudar_situacao($1, 'confirmado')", [id]),
      );
      expect((await fila()).map((e) => e.modelo).sort()).toEqual(["confirmacao", "lembrete"]);
    });
  });

  describe("quando cancela", () => {
    it.each([
      ["o cliente", () => maria],
      ["o dono", () => dono],
    ])("%s cancela: o cliente recebe o aviso e o lembrete some", async (_quem, quem) => {
      const id = await reservar(segunda("09:00"));
      await como(db, quem(), () => db.query("select * from public.cancelar_agendamento($1)", [id]));
      expect(await fila("cancelamento")).toHaveLength(1);
      expect(await fila("lembrete")).toHaveLength(0);
    });

    it("um lembrete que já foi enviado fica no histórico", async () => {
      const id = await reservar(segunda("09:00"));
      await db.exec("update public.emails_fila set enviado_em = now() where modelo = 'lembrete'");
      await como(db, maria, () => db.query("select * from public.cancelar_agendamento($1)", [id]));
      expect(await fila("lembrete")).toHaveLength(1);
    });
  });

  describe("envio (emails_reservar, email_enviado, email_falhou)", () => {
    it("entrega só o que já pode sair, e não entrega o mesmo duas vezes", async () => {
      await reservar(segunda("09:00"));
      const primeira = await reservarEmails();
      // A confirmação sai agora; o lembrete espera a véspera.
      expect(primeira.map((e) => e.modelo)).toEqual(["confirmacao"]);
      expect(primeira[0]!.tentativas).toBe(1);
      expect(await reservarEmails()).toEqual([]);
    });

    it("respeita o limite pedido", async () => {
      await reservar(segunda("09:00"));
      await reservar(segunda("10:00"));
      expect(await reservarEmails(1)).toHaveLength(1);
      expect(await reservarEmails(5)).toHaveLength(1);
    });

    it("um envio que travou volta para a fila depois do empréstimo de 10 minutos", async () => {
      await reservar(segunda("09:00"));
      const [e] = await reservarEmails();
      await db.query(
        "update public.emails_fila set enviar_em = now() - interval '1 minute' where id = $1",
        [e!.id],
      );
      const [de_novo] = await reservarEmails();
      expect(de_novo!.id).toBe(e!.id);
      expect(de_novo!.tentativas).toBe(2);
    });

    it("e-mail enviado sai da fila", async () => {
      await reservar(segunda("09:00"));
      const [e] = await reservarEmails();
      await enviar(e!.id);
      await vencerTudo();
      const [confirmacao] = await fila("confirmacao");
      expect(confirmacao!.enviado_em).not.toBeNull();
      // Tudo venceu, mas a confirmação já saiu: só o lembrete está na fila.
      expect((await reservarEmails()).map((x) => x.modelo)).toEqual(["lembrete"]);
    });

    it("lembrete não sai para quem desligou os lembretes, mas a confirmação sim", async () => {
      await reservar(segunda("09:00"));
      await db.query("update public.perfis set lembretes_por_email = false where id = $1", [maria]);
      await vencerTudo();
      expect((await reservarEmails()).map((e) => e.modelo)).toEqual(["confirmacao"]);
      // Religou antes de sair? Então o lembrete sai.
      await db.query("update public.perfis set lembretes_por_email = true where id = $1", [maria]);
      expect((await reservarEmails()).map((e) => e.modelo)).toEqual(["lembrete"]);
    });

    it("falha guarda o motivo e adia a nova tentativa", async () => {
      await reservar(segunda("09:00"));
      const [e] = await reservarEmails();
      await falhar(e!.id, "Resend fora do ar");
      const [confirmacao] = await fila("confirmacao");
      expect(confirmacao).toMatchObject({
        erro: "Resend fora do ar",
        enviado_em: null,
        tentativas: 1,
      });
      // A próxima tentativa só em alguns minutos.
      const adiado = await db.query<{ ok: boolean }>(
        "select enviar_em > now() + interval '4 minutes' as ok from public.emails_fila where id = $1",
        [e!.id],
      );
      expect(adiado.rows[0]!.ok).toBe(true);
    });

    it("na quinta falha desiste e avisa o dono pelo sino, uma vez só", async () => {
      await reservar(segunda("09:00"));
      for (let tentativa = 1; tentativa <= 5; tentativa++) {
        await vencerTudo();
        const [e] = await reservarEmails();
        expect(e!.tentativas).toBe(tentativa);
        await falhar(e!.id);
      }
      await vencerTudo();
      expect(await reservarEmails()).toEqual([]);

      const alertas = await como(
        db,
        dono,
        async () =>
          (
            await db.query<{ tipo: string; texto: string }>(
              "select tipo, texto from public.alertas where tipo = 'email_falhou'",
            )
          ).rows,
      );
      expect(alertas).toHaveLength(1);
      expect(alertas[0]!.texto).toBe(
        `Não conseguimos enviar o e-mail de confirmação para ${maria}@teste.local.`,
      );
    });

    it("falha de um e-mail que já foi enviado é ignorada", async () => {
      await reservar(segunda("09:00"));
      const [e] = await reservarEmails();
      await enviar(e!.id);
      await falhar(e!.id, "chegou depois");
      const [confirmacao] = await fila("confirmacao");
      expect(confirmacao).toMatchObject({ erro: null });
    });
  });

  describe("quem pode o quê", () => {
    it("só o dono vê a fila; cliente e visitante não", async () => {
      await reservar(segunda("09:00"));
      const contar = (quem: string | "anon") =>
        como(db, quem, async () =>
          Number(
            (await db.query<{ n: string }>("select count(*) as n from public.emails_fila")).rows[0]!
              .n,
          ),
        ).catch(() => "negado");
      expect(await contar(dono)).toBe(2);
      expect(await contar(maria)).toBe(0);
      expect(await contar("anon")).toBe("negado");
    });

    it.each([
      ["emails_reservar(5)"],
      ["email_enviado(gen_random_uuid())"],
      ["email_falhou(gen_random_uuid(), 'x')"],
    ])("ninguém de fora chama %s", async (chamada) => {
      for (const quem of [maria, dono, "anon"] as const) {
        await expect(
          como(db, quem, () => db.query(`select * from public.${chamada}`)),
        ).rejects.toThrow(/permission denied/);
      }
    });

    it("o gatilho que enche a fila não é chamável por fora", async () => {
      await expect(
        como(db, dono, () => db.query("select public.enfileirar_emails()")),
      ).rejects.toThrow(/permission denied/);
    });

    it("o dono manda tentar de novo um e-mail que desistiu; o cliente não", async () => {
      await reservar(segunda("09:00"));
      for (let tentativa = 1; tentativa <= 5; tentativa++) {
        await vencerTudo();
        const [e] = await reservarEmails();
        await falhar(e!.id);
      }
      const [desistido] = await fila("confirmacao");
      expect(desistido!.tentativas).toBe(5);

      await expect(
        como(db, maria, () => db.query("select public.reenviar_email($1)", [desistido!.id])),
      ).rejects.toThrow(/sem_permissao/);
      await como(db, dono, () => db.query("select public.reenviar_email($1)", [desistido!.id]));

      const [reaberto] = await fila("confirmacao");
      expect(reaberto).toMatchObject({ tentativas: 0, erro: null });
      expect((await reservarEmails()).map((e) => e.id)).toEqual([desistido!.id]);
    });

    it("reenviar um e-mail que não existe, ou que já saiu, dá erro claro", async () => {
      await reservar(segunda("09:00"));
      const [e] = await reservarEmails();
      await enviar(e!.id);
      for (const id of [e!.id, crypto.randomUUID()]) {
        await expect(
          como(db, dono, () => db.query("select public.reenviar_email($1)", [id])),
        ).rejects.toThrow(/email_inexistente/);
      }
    });
  });
});
