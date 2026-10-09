// @vitest-environment node
// O site calcula os horários livres (src/features/agenda/horarios-livres.ts) e o banco decide
// se aceita a reserva (public.reservar). Aqui as duas pontas rodam juntas: para cada horário
// possível do dia, o que o site oferece o banco precisa aceitar, e o que o site esconde o banco
// precisa recusar. Se as regras divergirem, o cliente veria um horário que dá erro ao confirmar.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  diaDaSemanaDe,
  horariosLivres,
  instanteNoFuso,
} from "../../src/features/agenda/horarios-livres";
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

const SP = "America/Sao_Paulo";
const MARGEM_DE_AGORA_MS = 2 * 60 * 1000;

describe("O que o site oferece é o que o banco aceita", () => {
  let db: Banco;
  let dono: string;
  let maria: string;
  let joao: string;
  let corte: string;
  let corteBarba: string;

  const diaDe = (diasAFrente: number) => emSaoPaulo(diasAFrente, "00:00").slice(0, 10);
  const diaDaSemana = (n: number) => diasAteDiaDaSemana(n);

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

  // O que o site faria: lê o funcionamento e os períodos ocupados e calcula.
  async function oferecidos(dia: string, duracaoMinutos: number): Promise<Set<string>> {
    const empresa = (
      await db.query<{ fuso: string; grade_minutos: number; antecedencia_max_dias: number }>(
        "select fuso, grade_minutos, antecedencia_max_dias from public.empresa",
      )
    ).rows[0]!;
    const intervalos = (
      await db.query<{ abre: string; fecha: string }>(
        `select to_char(abre, 'HH24:MI') as abre, to_char(fecha, 'HH24:MI') as fecha
         from public.funcionamento where dia_semana = $1 order by abre`,
        [diaDaSemanaDe(dia)],
      )
    ).rows;
    const ocupados = (
      await como(db, "anon", () =>
        db.query<{ inicio: Date; fim: Date }>("select * from public.horarios_ocupados($1)", [dia]),
      )
    ).rows.map((o) => ({
      inicio: new Date(o.inicio).toISOString(),
      fim: new Date(o.fim).toISOString(),
    }));
    return new Set(
      horariosLivres({
        dia,
        duracaoMinutos,
        gradeMinutos: empresa.grade_minutos,
        fuso: empresa.fuso,
        intervalos,
        ocupados,
        agora: new Date(),
        antecedenciaMaxDias: empresa.antecedencia_max_dias,
      }),
    );
  }

  const motivosDeRecusa =
    /^(horario_no_passado|horario_longe_demais|horario_fora_da_grade|fora_do_funcionamento|horario_bloqueado|horario_indisponivel)/;

  // Tenta reservar de verdade e desfaz: não deixa rastro.
  const bancoAceita = (servicoId: string, inicioIso: string) =>
    como(db, maria, async () => {
      await db.exec("begin");
      try {
        await db.query("select public.reservar($1, $2)", [servicoId, inicioIso]);
        return true;
      } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : String(erro);
        if (!motivosDeRecusa.test(mensagem)) throw erro;
        return false;
      } finally {
        await db.exec("rollback");
      }
    });

  async function conferir(dia: string, grade = 30) {
    const divergencias: string[] = [];
    let aceitos = 0;
    for (const [servicoId, duracao] of [
      [corte, 30],
      [corteBarba, 60],
    ] as const) {
      const esperados = await oferecidos(dia, duracao);
      for (let minuto = 0; minuto < 24 * 60; minuto += grade) {
        const instante = instanteNoFuso(dia, minuto, SP);
        // Perto do instante atual, o relógio do teste e o do banco podem discordar por segundos.
        if (Math.abs(instante - Date.now()) < MARGEM_DE_AGORA_MS) continue;
        const inicio = new Date(instante).toISOString();
        const aceito = await bancoAceita(servicoId, inicio);
        if (aceito) aceitos++;
        if (aceito !== esperados.has(inicio)) {
          divergencias.push(
            `${dia} ${String(Math.floor(minuto / 60)).padStart(2, "0")}:${String(minuto % 60).padStart(2, "0")} ` +
              `(${duracao} min): site ${esperados.has(inicio) ? "oferece" : "esconde"}, banco ${aceito ? "aceita" : "recusa"}`,
          );
        }
      }
    }
    expect(divergencias).toEqual([]);
    return aceitos;
  }

  it("dia útil livre: 20 horários de 30 min e 19 de 60 min", async () => {
    const aceitos = await conferir(diaDe(diaDaSemana(1)));
    expect(aceitos).toBe(20 + 19);
  });

  it("com agendamentos de outras pessoas e um bloqueio no meio do dia", async () => {
    const dia = diaDe(diaDaSemana(2));
    for (const [quem, servico, hora] of [
      [joao, corte, "10:00"],
      [joao, corteBarba, "14:30"],
    ] as const) {
      await como(db, quem, () =>
        db.query("select public.reservar($1, $2)", [servico, `${dia}T${hora}:00-03:00`]),
      );
    }
    await db.query(
      "insert into public.bloqueios (inicio, fim, motivo) values ($1, $2, 'Reunião')",
      [`${dia}T12:00:00-03:00`, `${dia}T13:00:00-03:00`],
    );
    const aceitos = await conferir(dia);
    expect(aceitos).toBeGreaterThan(0);
    expect(aceitos).toBeLessThan(39);
  });

  it("com intervalo de almoço (dois intervalos no mesmo dia)", async () => {
    const dia = diaDe(diaDaSemana(3));
    const diaSemana = diaDaSemanaDe(dia);
    await db.query("delete from public.funcionamento where dia_semana = $1", [diaSemana]);
    await db.query(
      `insert into public.funcionamento (dia_semana, abre, fecha)
       values ($1, '09:00', '12:00'), ($1, '14:00', '19:00')`,
      [diaSemana],
    );
    try {
      const aceitos = await conferir(dia);
      expect(aceitos).toBeLessThan(39); // o almoço tirou horários
    } finally {
      await db.query("delete from public.funcionamento where dia_semana = $1", [diaSemana]);
      await db.query(
        "insert into public.funcionamento (dia_semana, abre, fecha) values ($1, '09:00', '19:00')",
        [diaSemana],
      );
    }
  });

  it("domingo, fechado: nada oferecido e tudo recusado", async () => {
    expect(await conferir(diaDe(diaDaSemana(0)))).toBe(0);
  });

  it("longe demais: nada oferecido e tudo recusado", async () => {
    expect(await conferir(diaDe(45))).toBe(0);
  });

  it("hoje: o que já passou fica de fora dos dois lados", async () => {
    await conferir(diaDe(0));
  });

  it("com a grade de 15 minutos", async () => {
    await db.query("update public.empresa set grade_minutos = 15");
    try {
      const aceitos = await conferir(diaDe(diaDaSemana(4)), 15);
      expect(aceitos).toBeGreaterThan(39);
    } finally {
      await db.query("update public.empresa set grade_minutos = 30");
    }
  });
});
