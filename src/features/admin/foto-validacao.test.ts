import { describe, expect, it } from "vitest";

import { TAMANHO_MAXIMO_DA_FOTO, validarFoto } from "./foto-validacao";

describe("validarFoto", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("aceita %s", (type) => {
    expect(validarFoto({ type, size: 1024 })).toBeNull();
  });

  it.each(["image/gif", "image/svg+xml", "application/pdf", "video/mp4", ""])(
    "recusa %s, dizendo o que usar",
    (type) => {
      expect(validarFoto({ type, size: 1024 })).toBe("Use uma foto JPG, PNG ou WebP.");
    },
  );

  it("aceita até 5 MB cravados e recusa um byte a mais", () => {
    expect(validarFoto({ type: "image/webp", size: TAMANHO_MAXIMO_DA_FOTO })).toBeNull();
    expect(validarFoto({ type: "image/webp", size: TAMANHO_MAXIMO_DA_FOTO + 1 })).toBe(
      "A foto precisa ter até 5 MB.",
    );
  });

  it("recusa arquivo vazio", () => {
    expect(validarFoto({ type: "image/png", size: 0 })).toBe(
      "Esse arquivo está vazio. Escolha outra foto.",
    );
  });
});
