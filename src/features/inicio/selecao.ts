// Escolhas de apresentação da página inicial. Funções puras, para ter teste: quais avaliações
// aparecem e quantas marcas o cartão fidelidade desenha.
import type { AvaliacaoPublica } from "@/features/avaliacoes/banco";

// As avaliações que mais ajudam quem chega: com comentário, nota mais alta primeiro e, em
// empate, a mais recente.
export function escolherDepoimentos(
  avaliacoes: AvaliacaoPublica[],
  limite = 3,
): AvaliacaoPublica[] {
  return avaliacoes
    .filter((a) => a.comentario.trim() !== "")
    .sort((a, b) => b.nota - a.nota || b.criadaEm.localeCompare(a.criadaEm))
    .slice(0, limite);
}

// Quantas marcas desenhar no cartão: o número de atendimentos da regra, com teto para o cartão
// caber na tela. A última marca é sempre o presente.
export function marcasDoCartao(atendimentos: number, teto = 12): number {
  return Math.max(1, Math.min(atendimentos, teto));
}
