// Validação dos cadastros de serviço e produto, antes de falar com o banco. As mesmas regras
// valem lá (checks da tabela): preço em centavos inteiros e duração de 5 a 480 minutos, de 5 em 5.
import { reaisParaCentavos } from "@/lib/dinheiro";

export type FormularioDeServico = {
  nome: string;
  categoriaId: string; // "" = sem categoria
  novaCategoria: string; // se preenchida, cria a categoria e usa
  descricao: string;
  preco: string;
  duracao: string;
  destaque: boolean;
  ordem: string;
};

export type FormularioDeProduto = {
  nome: string;
  descricao: string;
  preco: string;
  ordem: string;
};

export type ErrosDoCadastro = Partial<
  Record<"nome" | "preco" | "duracao" | "ordem" | "novaCategoria", string>
>;

const inteiro = (texto: string) => (/^\d+$/.test(texto.trim()) ? Number(texto.trim()) : null);

function camposComuns(f: { nome: string; preco: string; ordem: string }) {
  const erros: ErrosDoCadastro = {};
  if (f.nome.trim().length < 2) erros.nome = "Informe o nome.";
  const precoCentavos = reaisParaCentavos(f.preco);
  if (precoCentavos === null) erros.preco = "Informe o preço, por exemplo 45,00.";
  const ordem = f.ordem.trim() === "" ? 0 : inteiro(f.ordem);
  if (ordem === null) erros.ordem = "Use um número inteiro, de 0 para cima.";
  return { erros, precoCentavos, ordem };
}

export type ServicoParaSalvar = {
  nome: string;
  categoriaId: string | null;
  novaCategoria: string | null;
  descricao: string;
  precoCentavos: number;
  duracaoMinutos: number;
  destaque: boolean;
  ordem: number;
};

export function validarServico(f: FormularioDeServico): {
  erros: ErrosDoCadastro;
  dados: ServicoParaSalvar | null;
} {
  const { erros, precoCentavos, ordem } = camposComuns(f);
  const duracao = inteiro(f.duracao);
  if (duracao === null || duracao < 5 || duracao > 480 || duracao % 5 !== 0) {
    erros.duracao = "Use de 5 a 480 minutos, de 5 em 5.";
  }
  const nova = f.novaCategoria.trim();
  if (nova.length > 0 && nova.length < 2)
    erros.novaCategoria = "O nome da categoria é curto demais.";
  if (
    Object.keys(erros).length > 0 ||
    precoCentavos === null ||
    duracao === null ||
    ordem === null
  ) {
    return { erros, dados: null };
  }
  return {
    erros,
    dados: {
      nome: f.nome.trim(),
      categoriaId: nova ? null : f.categoriaId || null,
      novaCategoria: nova || null,
      descricao: f.descricao.trim(),
      precoCentavos,
      duracaoMinutos: duracao,
      destaque: f.destaque,
      ordem,
    },
  };
}

export type ProdutoParaSalvar = {
  nome: string;
  descricao: string;
  precoCentavos: number;
  ordem: number;
};

export function validarProduto(f: FormularioDeProduto): {
  erros: ErrosDoCadastro;
  dados: ProdutoParaSalvar | null;
} {
  const { erros, precoCentavos, ordem } = camposComuns(f);
  if (Object.keys(erros).length > 0 || precoCentavos === null || ordem === null) {
    return { erros, dados: null };
  }
  return {
    erros,
    dados: { nome: f.nome.trim(), descricao: f.descricao.trim(), precoCentavos, ordem },
  };
}
