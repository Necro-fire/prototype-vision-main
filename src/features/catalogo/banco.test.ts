import { describe, expect, it } from "vitest";

import { produtoDeLinha, servicoDeLinha } from "./banco";

const servico = {
  id: "s1",
  nome: "Corte clássico",
  descricao: "",
  preco_centavos: 4500,
  duracao_minutos: 30,
  destaque: false,
  categorias: { nome: "Cortes" },
};

describe("foto no catálogo público", () => {
  it("serviço e produto carregam o endereço da foto quando existe", () => {
    expect(servicoDeLinha({ ...servico, foto_url: "https://x/a.webp" }).fotoUrl).toBe(
      "https://x/a.webp",
    );
    expect(
      produtoDeLinha({
        id: "p1",
        nome: "Pente",
        descricao: "",
        preco_centavos: 2500,
        foto_url: "https://x/p.webp",
      }).fotoUrl,
    ).toBe("https://x/p.webp");
  });

  it("sem foto (nulo ou ausente), fica nulo", () => {
    expect(servicoDeLinha({ ...servico, foto_url: null }).fotoUrl).toBeNull();
    expect(servicoDeLinha(servico).fotoUrl).toBeNull();
    expect(
      produtoDeLinha({ id: "p1", nome: "Pente", descricao: "", preco_centavos: 2500 }).fotoUrl,
    ).toBeNull();
  });
});
