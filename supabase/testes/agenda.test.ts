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

type Agendamento = {
  id: string;
  situacao: string;
  inicio: string;
  fim: string;
  cliente_nome: string;
  servico_nome: string;
  preco_centavos: number;
  duracao_minutos: number;
};

describe("Agenda no banco", () => {
  let db: Banco;
  let dono: string;
  let maria: string;
  let joao: string;
  let corte: string; // 30 min, R$ 45
  let corteBarba: string; // 60 min, R$ 70

  // Uma segunda-feira dentro dos próximos dias e a quinta seguinte, no fuso da barbearia.
  const segunda = (hora: string) => emSaoPaulo(diasAteDiaDaSemana(1), hora);
  const quinta = (hora: string) => emSaoPaulo(diasAteDiaDaSemana(4), hora);
  const domingo = (hora: string) => emSaoPaulo(diasAteDiaDaSemana(0), hora);

  beforeAll(async () => {
    db = await criarBanco();
    dono = await criarUsuario(db, { nome: "Dono", celular: "11900000000" });
    await tornarDono(db, dono);
    maria = await criarUsuario(db, { nome: "Maria", celular: "11999990001" });
    joao = await criarUsuario(db, { nome: "João", celular: "11999990002" });
    corte = await idDoServico(db, "Corte clássico");
    corteBarba = await idDoServico(db, "Corte + barba");
  });
  afterAll(() => db.close());

  beforeEach(async () => {
    await db.exec("truncate public.agendamentos, public.alertas, public.bloqueios cascade");
  });

  const reservar = (quem: string, servico: string, inicio: string, obs = "") =>
    como(db, quem, async () => {
      const { rows } = await db.query<Agendamento>("select * from public.reservar($1, $2, $3)", [
        servico,
        inicio,
        obs,
      ]);
      return rows[0]!;
    });

  const todos = async () =>
    (await db.query<Agendamento>("select * from public.agendamentos order by inicio")).rows;

  describe("reservar", () => {
    it("grava o agendamento com preço, nome e duração copiados, e o fim calculado", async () => {
      const a = await reservar(maria, corte, segunda("10:00"), "sem máquina 0");
      expect(a.situacao).toBe("agendado");
      expect(a.cliente_nome).toBe("Maria");
      expect(a.servico_nome).toBe("Corte clássico");
      expect(a.preco_centavos).toBe(4500);
      expect(a.duracao_minutos).toBe(30);
      expect(new Date(a.fim).getTime() - new Date(a.inicio).getTime()).toBe(30 * 60 * 1000);
    });

    it("não muda o que já foi marcado quando o serviço muda de preço", async () => {
      await reservar(maria, corte, segunda("10:00"));
      await db.query("update public.servicos set preco_centavos = 9900 where id = $1", [corte]);
      expect((await todos())[0]?.preco_centavos).toBe(4500);
      await db.query("update public.servicos set preco_centavos = 4500 where id = $1", [corte]);
    });

    it("exige conta: o visitante é barrado antes de qualquer regra", async () => {
      await expect(
        como(db, "anon", () =>
          db.query("select public.reservar($1, $2)", [corte, segunda("10:00")]),
        ),
      ).rejects.toThrow(/permission denied/);
    });

    it("exige nome e celular no perfil", async () => {
      const semCelular = await criarUsuario(db, { nome: "Sem Celular" });
      await expect(reservar(semCelular, corte, segunda("10:00"))).rejects.toThrow(
        /perfil_incompleto/,
      );
    });

    it("recusa serviço inativo", async () => {
      await db.query("update public.servicos set ativo = false where id = $1", [corte]);
      await expect(reservar(maria, corte, segunda("10:00"))).rejects.toThrow(
        /servico_indisponivel/,
      );
      await db.query("update public.servicos set ativo = true where id = $1", [corte]);
    });

    it("recusa horário no passado e horário longe demais", async () => {
      await expect(reservar(maria, corte, emSaoPaulo(-1, "10:00"))).rejects.toThrow(
        /horario_no_passado/,
      );
      await expect(reservar(maria, corte, emSaoPaulo(60, "10:00"))).rejects.toThrow(
        /horario_longe_demais/,
      );
    });

    it("recusa horário fora da grade de 30 minutos", async () => {
      await expect(reservar(maria, corte, segunda("10:10"))).rejects.toThrow(
        /horario_fora_da_grade/,
      );
    });

    it("recusa dia fechado e horário antes de abrir", async () => {
      await expect(reservar(maria, corte, domingo("10:00"))).rejects.toThrow(
        /fora_do_funcionamento/,
      );
      await expect(reservar(maria, corte, segunda("08:30"))).rejects.toThrow(
        /fora_do_funcionamento/,
      );
    });

    it("exige que o atendimento inteiro termine antes de fechar", async () => {
      // Corte + barba dura 60 min: às 18:30 terminaria às 19:30
      await expect(reservar(maria, corteBarba, segunda("18:30"))).rejects.toThrow(
        /fora_do_funcionamento/,
      );
      // Corte de 30 min às 18:30 termina às 19:00, exatamente no fechamento
      expect((await reservar(maria, corte, segunda("18:30"))).situacao).toBe("agendado");
    });

    it("calcula o expediente no fuso da barbearia, não em UTC", async () => {
      // 12:00 UTC é 09:00 em São Paulo: dentro do expediente
      const diaIso = segunda("10:00").slice(0, 10);
      expect((await reservar(maria, corte, `${diaIso}T12:00:00Z`)).situacao).toBe("agendado");
      // 09:00 UTC é 06:00 em São Paulo: fora do expediente
      await expect(reservar(joao, corte, `${diaIso}T09:00:00Z`)).rejects.toThrow(
        /fora_do_funcionamento/,
      );
    });

    it("recusa horário bloqueado, mas aceita o que encosta no bloqueio", async () => {
      await como(db, dono, () =>
        db.query("insert into public.bloqueios (inicio, fim, motivo) values ($1, $2, 'Almoço')", [
          segunda("12:00"),
          segunda("14:00"),
        ]),
      );
      await expect(reservar(maria, corte, segunda("13:00"))).rejects.toThrow(/horario_bloqueado/);
      await expect(reservar(maria, corteBarba, segunda("11:30"))).rejects.toThrow(
        /horario_bloqueado/,
      );
      expect((await reservar(maria, corte, segunda("11:30"))).situacao).toBe("agendado");
      expect((await reservar(maria, corte, segunda("14:00"))).situacao).toBe("agendado");
    });

    it("barra dois clientes no mesmo horário e também a sobreposição parcial", async () => {
      await reservar(maria, corte, segunda("10:00"));
      await expect(reservar(joao, corte, segunda("10:00"))).rejects.toThrow(/horario_indisponivel/);
      // Corte + barba às 9:30 vai até 10:30 e invade as 10:00 da Maria
      await expect(reservar(joao, corteBarba, segunda("09:30"))).rejects.toThrow(
        /horario_indisponivel/,
      );
      // Encostado, sem sobrepor, pode
      expect((await reservar(joao, corte, segunda("10:30"))).situacao).toBe("agendado");
      expect((await reservar(joao, corte, segunda("09:30"))).situacao).toBe("agendado");
    });

    it("libera o horário quando o agendamento é cancelado ou vira falta", async () => {
      const a = await reservar(maria, corte, segunda("10:00"));
      await como(db, maria, () => db.query("select public.cancelar_agendamento($1)", [a.id]));
      expect((await reservar(joao, corte, segunda("10:00"))).situacao).toBe("agendado");
      await db.query(
        "update public.agendamentos set situacao = 'nao_compareceu' where cliente_id = $1",
        [joao],
      );
      expect((await reservar(maria, corte, segunda("10:00"))).situacao).toBe("agendado");
    });

    it("limita os agendamentos futuros por conta", async () => {
      await reservar(maria, corte, segunda("10:00"));
      await reservar(maria, corte, segunda("11:00"));
      await reservar(maria, corte, segunda("12:00"));
      await expect(reservar(maria, corte, segunda("13:00"))).rejects.toThrow(
        /limite_de_agendamentos/,
      );
      // Outra pessoa não é afetada
      expect((await reservar(joao, corte, segunda("13:00"))).situacao).toBe("agendado");
      // E o limite é configurável
      await db.query("update public.empresa set max_agendamentos_futuros = 4");
      expect((await reservar(maria, corte, segunda("14:00"))).situacao).toBe("agendado");
      await db.query("update public.empresa set max_agendamentos_futuros = 3");
    });
  });

  describe("horários ocupados (público, sem identificar ninguém)", () => {
    it("o visitante vê só os períodos, sem nome nem serviço", async () => {
      await reservar(maria, corte, segunda("10:00"));
      const dia = segunda("10:00").slice(0, 10);
      const { rows, fields } = await como(db, "anon", () =>
        db.query<{ inicio: string; fim: string }>("select * from public.horarios_ocupados($1)", [
          dia,
        ]),
      );
      expect(fields.map((f) => f.name)).toEqual(["inicio", "fim"]);
      expect(rows).toHaveLength(1);
      expect(new Date(rows[0]!.fim).getTime() - new Date(rows[0]!.inicio).getTime()).toBe(
        30 * 60 * 1000,
      );
    });

    it("não lista cancelados e inclui os bloqueios", async () => {
      const a = await reservar(maria, corte, segunda("10:00"));
      await como(db, maria, () => db.query("select public.cancelar_agendamento($1)", [a.id]));
      await db.query("insert into public.bloqueios (inicio, fim) values ($1, $2)", [
        segunda("12:00"),
        segunda("14:00"),
      ]);
      const dia = segunda("10:00").slice(0, 10);
      const { rows } = await como(db, "anon", () =>
        db.query("select * from public.horarios_ocupados($1)", [dia]),
      );
      expect(rows).toHaveLength(1);
    });

    it("só devolve o dia pedido, no fuso da barbearia", async () => {
      await reservar(maria, corte, segunda("10:00"));
      const outroDia = quinta("10:00").slice(0, 10);
      const { rows } = await como(db, "anon", () =>
        db.query("select * from public.horarios_ocupados($1)", [outroDia]),
      );
      expect(rows).toHaveLength(0);
    });
  });

  describe("cancelar", () => {
    it("o cliente cancela o próprio e o dono vê o aviso", async () => {
      const a = await reservar(maria, corte, segunda("10:00"));
      const { rows } = await como(db, maria, () =>
        db.query<Agendamento>("select * from public.cancelar_agendamento($1)", [a.id]),
      );
      expect(rows[0]?.situacao).toBe("cancelado");
      const alertas = await como(db, dono, () =>
        db.query<{ tipo: string; texto: string }>(
          "select tipo, texto from public.alertas order by criado_em",
        ),
      );
      expect(alertas.rows.map((r) => r.tipo)).toEqual(["novo_agendamento", "cancelamento"]);
    });

    it("um cliente não cancela, nem enxerga, o agendamento de outro", async () => {
      const a = await reservar(maria, corte, segunda("10:00"));
      await expect(
        como(db, joao, () => db.query("select public.cancelar_agendamento($1)", [a.id])),
      ).rejects.toThrow(/agendamento_inexistente/);
      expect((await todos())[0]?.situacao).toBe("agendado");
    });

    it("o dono cancela qualquer um, sem gerar aviso para si mesmo", async () => {
      const a = await reservar(maria, corte, segunda("10:00"));
      await como(db, dono, () => db.query("select public.cancelar_agendamento($1)", [a.id]));
      expect((await todos())[0]?.situacao).toBe("cancelado");
      const { rows } = await db.query(
        "select tipo from public.alertas where tipo = 'cancelamento'",
      );
      expect(rows).toHaveLength(0);
    });

    it("não cancela o que já terminou nem o que já começou (para o cliente)", async () => {
      const a = await reservar(maria, corte, segunda("10:00"));
      await db.query("update public.agendamentos set situacao = 'concluido' where id = $1", [a.id]);
      await expect(
        como(db, maria, () => db.query("select public.cancelar_agendamento($1)", [a.id])),
      ).rejects.toThrow(/situacao_final/);

      // Agendamento que já começou, inserido direto como superusuário
      const { rows } = await db.query<{ id: string }>(
        `insert into public.agendamentos (cliente_id, cliente_nome, cliente_celular, servico_id,
           servico_nome, preco_centavos, duracao_minutos, inicio, fim)
         values ($1, 'Maria', '11999990001', $2, 'Corte clássico', 4500, 30,
           now() - interval '10 minutes', now() + interval '20 minutes') returning id`,
        [maria, corte],
      );
      await expect(
        como(db, maria, () => db.query("select public.cancelar_agendamento($1)", [rows[0]!.id])),
      ).rejects.toThrow(/ja_comecou/);
    });
  });

  describe("mudar a situação (só o dono)", () => {
    it("segue o caminho agendado, confirmado, em atendimento e concluído, e registra cada passo", async () => {
      const a = await reservar(maria, corte, segunda("10:00"));
      for (const para of ["confirmado", "em_atendimento", "concluido"]) {
        await como(db, dono, () =>
          db.query("select public.mudar_situacao($1, $2, 'pix')", [a.id, para]),
        );
      }
      const { rows } = await db.query<{ de: string | null; para: string }>(
        "select de, para from public.agendamento_eventos where agendamento_id = $1 order by em, para",
        [a.id],
      );
      expect(rows.map((r) => `${r.de ?? "-"}>${r.para}`).sort()).toEqual(
        [
          "-" + ">agendado",
          "agendado>confirmado",
          "confirmado>em_atendimento",
          "em_atendimento>concluido",
        ].sort(),
      );
    });

    it("recusa transição fora do caminho e situação final", async () => {
      const a = await reservar(maria, corte, segunda("10:00"));
      await como(db, dono, () =>
        db.query("select public.mudar_situacao($1, 'confirmado')", [a.id]),
      );
      await expect(
        como(db, dono, () => db.query("select public.mudar_situacao($1, 'concluido')", [a.id])),
      ).rejects.toThrow(/transicao_invalida/);
      await como(db, dono, () => db.query("select public.cancelar_agendamento($1)", [a.id]));
      await expect(
        como(db, dono, () => db.query("select public.mudar_situacao($1, 'confirmado')", [a.id])),
      ).rejects.toThrow(/transicao_invalida/);
    });

    it("só marca falta depois do horário", async () => {
      const a = await reservar(maria, corte, segunda("10:00"));
      await expect(
        como(db, dono, () =>
          db.query("select public.mudar_situacao($1, 'nao_compareceu')", [a.id]),
        ),
      ).rejects.toThrow(/ainda_nao_comecou/);
    });

    it("o cliente não muda a situação", async () => {
      const a = await reservar(maria, corte, segunda("10:00"));
      await expect(
        como(db, maria, () => db.query("select public.mudar_situacao($1, 'concluido')", [a.id])),
      ).rejects.toThrow(/sem_permissao/);
    });

    it("o cliente vê o histórico do próprio agendamento, e só dele", async () => {
      const a = await reservar(maria, corte, segunda("10:00"));
      const meu = await como(db, maria, () =>
        db.query("select * from public.agendamento_eventos where agendamento_id = $1", [a.id]),
      );
      expect(meu.rows).toHaveLength(1);
      const dele = await como(db, joao, () =>
        db.query("select * from public.agendamento_eventos where agendamento_id = $1", [a.id]),
      );
      expect(dele.rows).toHaveLength(0);
    });
  });

  describe("remarcar", () => {
    it("o cliente remarca o próprio, mantendo o serviço, e o dono é avisado", async () => {
      const a = await reservar(maria, corteBarba, segunda("10:00"));
      const { rows } = await como(db, maria, () =>
        db.query<Agendamento>("select * from public.remarcar($1, $2)", [a.id, quinta("15:00")]),
      );
      expect(new Date(rows[0]!.fim).getTime() - new Date(rows[0]!.inicio).getTime()).toBe(
        60 * 60 * 1000,
      );
      const alertas = await db.query<{ tipo: string }>(
        "select tipo from public.alertas order by criado_em",
      );
      expect(alertas.rows.map((r) => r.tipo)).toContain("remarcacao");
    });

    it("segue as mesmas regras de horário de uma reserva nova", async () => {
      const a = await reservar(maria, corte, segunda("10:00"));
      await reservar(joao, corte, quinta("15:00"));
      const remarcar = (inicio: string) =>
        como(db, maria, () => db.query("select public.remarcar($1, $2)", [a.id, inicio]));
      await expect(remarcar(quinta("15:00"))).rejects.toThrow(/horario_indisponivel/);
      await expect(remarcar(domingo("10:00"))).rejects.toThrow(/fora_do_funcionamento/);
      await expect(remarcar(quinta("15:10"))).rejects.toThrow(/horario_fora_da_grade/);
      // A tentativa recusada não mexeu no agendamento
      expect(new Date((await todos()).find((x) => x.id === a.id)!.inicio).toISOString()).toBe(
        new Date(segunda("10:00")).toISOString(),
      );
    });

    it("pode remarcar para um horário que sobrepõe o próprio horário antigo", async () => {
      const a = await reservar(maria, corteBarba, segunda("10:00"));
      const { rows } = await como(db, maria, () =>
        db.query<Agendamento>("select * from public.remarcar($1, $2)", [a.id, segunda("10:30")]),
      );
      expect(new Date(rows[0]!.inicio).toISOString()).toBe(
        new Date(segunda("10:30")).toISOString(),
      );
    });

    it("um cliente não remarca o agendamento de outro", async () => {
      const a = await reservar(maria, corte, segunda("10:00"));
      await expect(
        como(db, joao, () => db.query("select public.remarcar($1, $2)", [a.id, quinta("15:00")])),
      ).rejects.toThrow(/agendamento_inexistente/);
    });
  });

  describe("bloqueios e avisos", () => {
    it("não se bloqueia um período com agendamento ativo", async () => {
      const a = await reservar(maria, corte, segunda("10:00"));
      const bloquear = () =>
        como(db, dono, () =>
          db.query("insert into public.bloqueios (inicio, fim) values ($1, $2)", [
            segunda("09:00"),
            segunda("11:00"),
          ]),
        );
      await expect(bloquear()).rejects.toThrow(/bloqueio_com_agendamento/);
      await como(db, dono, () => db.query("select public.cancelar_agendamento($1)", [a.id]));
      await bloquear();
    });

    it("registra quem criou o bloqueio e só o dono bloqueia", async () => {
      await como(db, dono, () =>
        db.query("insert into public.bloqueios (inicio, fim) values ($1, $2)", [
          quinta("09:00"),
          quinta("10:00"),
        ]),
      );
      const { rows } = await db.query<{ criado_por: string }>(
        "select criado_por from public.bloqueios",
      );
      expect(rows[0]?.criado_por).toBe(dono);
      await expect(
        como(db, maria, () =>
          db.query("insert into public.bloqueios (inicio, fim) values ($1, $2)", [
            quinta("11:00"),
            quinta("12:00"),
          ]),
        ),
      ).rejects.toThrow(/row-level security/);
    });

    it("avisa o dono de cada agendamento novo, e só o dono lê os avisos", async () => {
      await reservar(maria, corte, segunda("10:00"));
      const doDono = await como(db, dono, () =>
        db.query<{ tipo: string; texto: string }>("select tipo, texto from public.alertas"),
      );
      expect(doDono.rows).toHaveLength(1);
      expect(doDono.rows[0]?.tipo).toBe("novo_agendamento");
      expect(doDono.rows[0]?.texto).toMatch(
        /^Maria agendou Corte clássico para \d{2}\/\d{2} às 10:00\.$/,
      );
      const daMaria = await como(db, maria, () => db.query("select * from public.alertas"));
      expect(daMaria.rows).toHaveLength(0);
    });

    it("o dono marca o aviso como lido, mas não edita o texto; o cliente não marca nada", async () => {
      await reservar(maria, corte, segunda("10:00"));
      const marcaMaria = await como(db, maria, () =>
        db.query("update public.alertas set lido_em = now() returning id"),
      );
      expect(marcaMaria.rows).toHaveLength(0);
      await como(db, dono, async () => {
        await expect(db.query("update public.alertas set texto = 'x'")).rejects.toThrow(
          /permission denied/,
        );
        const { rows } = await db.query("update public.alertas set lido_em = now() returning id");
        expect(rows).toHaveLength(1);
      });
    });
  });

  describe("excluir a própria conta (LGPD)", () => {
    it("remove a conta e anonimiza o histórico, que continua para o caixa", async () => {
      const outra = await criarUsuario(db, { nome: "Ana Lima", celular: "11988887777" });
      await reservar(outra, corte, segunda("10:00"));
      await como(db, outra, () => db.query("select public.excluir_minha_conta()"));
      const { rows } = await db.query<{
        cliente_id: string | null;
        cliente_nome: string;
        cliente_celular: string;
        preco_centavos: number;
      }>(
        "select cliente_id, cliente_nome, cliente_celular, preco_centavos from public.agendamentos",
      );
      expect(rows[0]).toEqual({
        cliente_id: null,
        cliente_nome: "Cliente removido",
        cliente_celular: "",
        preco_centavos: 4500,
      });
      const perfil = await db.query("select * from public.perfis where id = $1", [outra]);
      expect(perfil.rows).toHaveLength(0);
    });

    it("o dono não pode apagar a própria conta por engano", async () => {
      await expect(
        como(db, dono, () => db.query("select public.excluir_minha_conta()")),
      ).rejects.toThrow(/dono_nao_pode_excluir/);
    });
  });
});
