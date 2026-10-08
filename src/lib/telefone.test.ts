import { describe, expect, it } from "vitest";
import { normalizePhone } from "./telefone";

describe("Celular", () => {
  it("normaliza o mesmo celular para uma identificação única", () => {
    expect(normalizePhone("+55 (11) 99999-9999")).toBe(normalizePhone("11999999999"));
    expect(normalizePhone("(11) 99999-9999")).toBe("11999999999");
  });
});
