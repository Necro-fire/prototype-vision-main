// Validação do que o dono edita em Configurações, antes de falar com o banco. As mesmas regras
// valem lá (checks e restrições das tabelas); aqui elas viram frases que dizem o que ajustar.
import { instanteNoFuso } from "@/features/agenda/horarios-livres";
import { somarDias } from "@/features/agenda/expediente";

export const nomesDosDias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// ---- Funcionamento -------------------------------------------------------------------------

export type IntervaloEditavel = { abre: string; fecha: string }; // "HH:MM"
export type DiaEditavel = { aberto: boolean; intervalos: IntervaloEditavel[] };

const hora = /^([01]\d|2[0-3]):[0-5]\d$/;
const emMinutos = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));

// Um erro por dia da semana (índice 0 = domingo), ou nenhum. Dia fechado não tem o que conferir.
export function validarFuncionamento(dias: DiaEditavel[]) {
  const erros: (string | undefined)[] = dias.map((dia) => {
    if (!dia.aberto) return undefined;
    if (dia.intervalos.length === 0) return "Informe o horário ou marque o dia como fechado.";
    for (const i of dia.intervalos) {
      if (!hora.test(i.abre) || !hora.test(i.fecha)) return "Use horas no formato 09:00.";
      if (emMinutos(i.fecha) <= emMinutos(i.abre))
        return "O fechamento precisa ser depois da abertura.";
    }
    const ordenados = [...dia.intervalos].sort((a, b) => emMinutos(a.abre) - emMinutos(b.abre));
    for (let n = 1; n < ordenados.length; n++) {
      if (emMinutos(ordenados[n]!.abre) < emMinutos(ordenados[n - 1]!.fecha)) {
        return "Os horários do dia se sobrepõem.";
      }
    }
    return undefined;
  });
  const intervalos = dias.flatMap((dia, dia_semana) =>
    dia.aberto
      ? [...dia.intervalos]
          .sort((a, b) => emMinutos(a.abre) - emMinutos(b.abre))
          .map((i) => ({ dia_semana, abre: i.abre, fecha: i.fecha }))
      : [],
  );
  return { erros, valido: erros.every((e) => e === undefined), intervalos };
}

// ---- Regras da agenda ----------------------------------------------------------------------

export const GRADES = [10, 15, 20, 30, 60];

export type FormularioDeRegras = { grade: string; antecedencia: string; limite: string };

export function validarRegras(f: FormularioDeRegras) {
  const erros: Partial<Record<keyof FormularioDeRegras, string>> = {};
  const inteiro = (t: string) => (/^\d+$/.test(t.trim()) ? Number(t.trim()) : null);
  const grade = inteiro(f.grade);
  const antecedencia = inteiro(f.antecedencia);
  const limite = inteiro(f.limite);
  if (grade === null || !GRADES.includes(grade)) erros.grade = "Escolha uma das opções.";
  if (antecedencia === null || antecedencia < 1 || antecedencia > 365) {
    erros.antecedencia = "Use de 1 a 365 dias.";
  }
  if (limite === null || limite < 1 || limite > 20) erros.limite = "Use de 1 a 20 horários.";
  if (Object.keys(erros).length > 0 || grade === null || antecedencia === null || limite === null) {
    return { erros, dados: null };
  }
  return {
    erros,
    dados: {
      grade_minutos: grade,
      antecedencia_max_dias: antecedencia,
      max_agendamentos_futuros: limite,
    },
  };
}

// ---- Dados da barbearia --------------------------------------------------------------------

export type FormularioDaEmpresa = {
  nome: string;
  endereco: string;
  telefone: string;
  whatsapp: string;
  instagram: string;
};

// "@onstyle", "instagram.com/onstyle/" e "https://www.instagram.com/onstyle?igsh=x" viram "onstyle".
export function usuarioDoInstagram(texto: string) {
  const limpo = texto
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]!
    .trim();
  return limpo;
}

export function validarEmpresa(f: FormularioDaEmpresa) {
  const erros: Partial<Record<keyof FormularioDaEmpresa, string>> = {};
  if (f.nome.trim().length < 2) erros.nome = "Informe o nome da barbearia.";
  const instagram = usuarioDoInstagram(f.instagram);
  if (instagram && !/^[A-Za-z0-9._]{1,30}$/.test(instagram)) {
    erros.instagram = "Use só o nome de usuário, por exemplo onstyle.";
  }
  for (const campo of ["telefone", "whatsapp"] as const) {
    const digitos = f[campo].replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
    if (f[campo].trim() && !/^\d{10,11}$/.test(digitos)) {
      erros[campo] = "Informe o número com DDD, por exemplo (11) 91234-5678.";
    }
  }
  if (Object.keys(erros).length > 0) return { erros, dados: null };
  const vazioViraNulo = (t: string) => (t.trim() === "" ? null : t.trim());
  return {
    erros,
    dados: {
      nome: f.nome.trim(),
      endereco: vazioViraNulo(f.endereco),
      telefone: vazioViraNulo(f.telefone),
      whatsapp: vazioViraNulo(f.whatsapp),
      instagram: instagram === "" ? null : instagram,
    },
  };
}

// ---- Bloqueios -----------------------------------------------------------------------------

export type FormularioDeBloqueio = {
  dataInicial: string; // AAAA-MM-DD
  dataFinal: string; // AAAA-MM-DD, inclusive
  diaInteiro: boolean;
  horaInicial: string; // "HH:MM", quando não é dia inteiro
  horaFinal: string;
  motivo: string;
};

// Bloqueio vira um período de instantes no fuso da barbearia. "Dia inteiro" vai da meia-noite do
// primeiro dia até a meia-noite depois do último.
export function validarBloqueio(f: FormularioDeBloqueio, fuso: string) {
  const erros: Partial<Record<"dataInicial" | "dataFinal" | "horaInicial" | "horaFinal", string>> =
    {};
  const data = /^\d{4}-\d{2}-\d{2}$/;
  if (!data.test(f.dataInicial)) erros.dataInicial = "Informe a data.";
  const dataFinal = f.dataFinal || f.dataInicial;
  if (f.dataFinal && !data.test(f.dataFinal)) erros.dataFinal = "Informe a data.";
  if (!f.diaInteiro) {
    if (!hora.test(f.horaInicial)) erros.horaInicial = "Use horas no formato 09:00.";
    if (!hora.test(f.horaFinal)) erros.horaFinal = "Use horas no formato 09:00.";
  }
  if (Object.keys(erros).length > 0) return { erros, dados: null };

  const inicio = f.diaInteiro
    ? instanteNoFuso(f.dataInicial, 0, fuso)
    : instanteNoFuso(f.dataInicial, emMinutos(f.horaInicial), fuso);
  const fim = f.diaInteiro
    ? instanteNoFuso(somarDias(dataFinal, 1), 0, fuso)
    : instanteNoFuso(dataFinal, emMinutos(f.horaFinal), fuso);
  if (fim <= inicio) {
    return {
      erros: { dataFinal: "O fim precisa ser depois do início." },
      dados: null,
    };
  }
  return {
    erros,
    dados: {
      inicio: new Date(inicio).toISOString(),
      fim: new Date(fim).toISOString(),
      motivo: f.motivo.trim(),
    },
  };
}
