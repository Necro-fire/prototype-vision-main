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

type Intervalo = { dia_semana: number; abre: string; fecha: string };

describe("Funcionamento no banco (salvar_funcionamento)", () => {
  let db: Banco;
  let dono: string;
  let maria: string;
  let corte: string;

  const segunda = (hora: string) => emSaoPaulo(diasAteDiaDaSemana(1), hora);

  beforeAll(async () => {
    db = await criarBanco();
    dono = await criarUsuario(db, { nome: "Dono", celular: "11900000000" });
    await tornarDono(db, dono);
    maria = await criarUsuario(db, { nome: "Maria", celular: "11999990001" });
    corte = await idDoServico(db, "Corte clássico");
  });
  afterAll(() => db.close());

  // Cada teste começa do funcionamento do seed: segunda a sábado, das 9h às 19h.
  beforeEach(async () => {
    await db.exec(`
      truncate public.agendamentos, public.alertas cascade;
      delete from public.funcionamento where true;
      insert into public.funcionamento (dia_semana, abre, fecha)
        select dia, time '09:00', time '19:00' from generate_series(1, 6) as dia;
    `);
  });

  const salvar = (quem: string | "anon", intervalos: unknown) =>
    como(db, quem, async () => {
      await db.query("select public.salvar_funcionamento($1::jsonb)", [JSON.stringify(intervalos)]);
    });

  const atual = async () =>
    (
      await db.query<Intervalo>(
        `select dia_semana, to_char(abre, 'HH24:MI') as abre, to_char(fecha, 'HH24:MI') as fecha
         from public.funcionamento order by dia_semana, abre`,
      )
    ).rows;

  const reservar = (inicio: string) =>
    como(db, maria, async () => {
      await db.query("select * from public.reservar($1, $2, '')", [corte, inicio]);
    });

  it("o dono troca todo o funcionamento de uma vez", async () => {
    await salvar(dono, [
      { dia_semana: 2, abre: "10:00", fecha: "16:00" },
      { dia_semana: 6, abre: "08:00", fecha: "12:00" },
    ]);
    expect(await atual()).toEqual([
      { dia_semana: 2, abre: "10:00", fecha: "16:00" },
      { dia_semana: 6, abre: "08:00", fecha: "12:00" },
    ]);
  });

  it("aceita o almoço: dois intervalos no mesmo dia, e a reserva respeita o intervalo", async () => {
    await salvar(dono, [
      { dia_semana: 1, abre: "09:00", fecha: "12:00" },
      { dia_semana: 1, abre: "14:00", fecha: "19:00" },
    ]);
    await expect(reservar(segunda("12:00"))).rejects.toThrow(/fora_do_funcionamento/);
    await expect(reservar(segunda("12:30"))).rejects.toThrow(/fora_do_funcionamento/);
    await expect(reservar(segunda("13:30"))).rejects.toThrow(/fora_do_funcionamento/);
    // O que termina exatamente na hora do almoço, ou começa na volta, cabe.
    await reservar(segunda("11:30"));
    await reservar(segunda("14:00"));
  });

  it("o visitante enxerga o funcionamento novo", async () => {
    await salvar(dono, [{ dia_semana: 3, abre: "09:00", fecha: "13:00" }]);
    const linhas = await como(
      db,
      "anon",
      async () => (await db.query("select dia_semana from public.funcionamento")).rows,
    );
    expect(linhas).toEqual([{ dia_semana: 3 }]);
  });

  it("lista vazia fecha a barbearia todos os dias", async () => {
    await salvar(dono, []);
    expect(await atual()).toEqual([]);
    await expect(reservar(segunda("10:00"))).rejects.toThrow(/fora_do_funcionamento/);
  });

  it("é tudo ou nada: se um intervalo sobrepõe outro, o funcionamento antigo continua", async () => {
    const antes = await atual();
    await expect(
      salvar(dono, [
        { dia_semana: 1, abre: "09:00", fecha: "13:00" },
        { dia_semana: 1, abre: "12:00", fecha: "18:00" },
      ]),
    ).rejects.toThrow(/intervalos_sobrepostos/);
    expect(await atual()).toEqual(antes);
  });

  it("é tudo ou nada: intervalo inválido (fecha antes de abrir, dia 9) não muda nada", async () => {
    const antes = await atual();
    await expect(salvar(dono, [{ dia_semana: 1, abre: "18:00", fecha: "09:00" }])).rejects.toThrow(
      /intervalo_invalido/,
    );
    await expect(salvar(dono, [{ dia_semana: 9, abre: "09:00", fecha: "18:00" }])).rejects.toThrow(
      /intervalo_invalido/,
    );
    await expect(salvar(dono, [{ dia_semana: 1, abre: "nove", fecha: "18:00" }])).rejects.toThrow(
      /intervalo_invalido/,
    );
    expect(await atual()).toEqual(antes);
  });

  it("recusa o que não é uma lista", async () => {
    await expect(salvar(dono, { dia_semana: 1 })).rejects.toThrow(/intervalos_invalidos/);
    await expect(salvar(dono, null)).rejects.toThrow(/intervalos_invalidos/);
  });

  it("cliente não muda o funcionamento", async () => {
    const antes = await atual();
    await expect(salvar(maria, [])).rejects.toThrow(/sem_permissao/);
    expect(await atual()).toEqual(antes);
  });

  it("visitante nem chega a chamar a função", async () => {
    await expect(salvar("anon", [])).rejects.toThrow(/permission denied/);
  });
});
