import { describe, expect, it } from "vitest";

import type { AvaliacaoPublica } from "@/features/avaliacoes/banco";
import { escolherDepoimentos, marcasDoCartao } from "./selecao";

const avaliacao = (
  autor: string,
  nota: number,
  criadaEm: string,
  comentario = "Ótimo",
): AvaliacaoPublica => ({ autor, nota, criadaEm, comentario });

describe("escolherDepoimentos", () => {
  it("ignora avaliação sem comentário e ordena por nota e data", () => {
    const lista = [
      avaliacao("Ana A.", 4, "2026-10-01T10:00:00Z"),
      avaliacao("Bia B.", 5, "2026-09-01T10:00:00Z"),
      avaliacao("Caio C.", 5, "2026-10-05T10:00:00Z"),
      avaliacao("Davi D.", 5, "2026-10-06T10:00:00Z", "   "),
    ];
    expect(escolherDepoimentos(lista).map((a) => a.autor)).toEqual(["Caio C.", "Bia B.", "Ana A."]);
  });

  it("respeita o limite", () => {
    const lista = Array.from({ length: 6 }, (_, i) => avaliacao(`P${i}`, 5, `2026-10-0${i + 1}`));
    expect(escolherDepoimentos(lista, 2)).toHaveLength(2);
  });
});

describe("marcasDoCartao", () => {
  it("fica entre 1 e o teto", () => {
    expect(marcasDoCartao(0)).toBe(1);
    expect(marcasDoCartao(5)).toBe(5);
    expect(marcasDoCartao(40)).toBe(12);
  });
});
