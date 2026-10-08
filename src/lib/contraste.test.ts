import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contraste";

describe("Contraste", () => {
  it("preto sobre branco é 21:1, em qualquer ordem", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 1);
  });
  it("cor igual não tem contraste", () => {
    expect(contrastRatio("#1F3FBF", "#1F3FBF")).toBeCloseTo(1, 5);
  });
  it("confere um par conhecido", () => {
    expect(contrastRatio("#16181D", "#FDFDFB")).toBeCloseTo(17.44, 1);
  });
});
