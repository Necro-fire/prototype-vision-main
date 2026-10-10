// Confere, a partir do próprio styles.css, que as cores do Design System passam no contraste.
// Se alguém trocar uma cor e quebrar a legibilidade, o teste falha antes de ir ao ar.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/contraste";

const css = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");
const raiz = css.slice(css.indexOf(":root {"), css.indexOf("@layer base"));

function cor(nome: string) {
  const casamento = new RegExp(`--${nome}:\\s*(#[0-9a-fA-F]{6})`).exec(raiz);
  if (!casamento?.[1]) throw new Error(`Token --${nome} não achado em styles.css`);
  return casamento[1];
}

// [texto, fundo, mínimo]. Texto exige 4,5; bordas e componentes, 3.
const pares: [string, string, number][] = [
  ["foreground", "background", 4.5],
  ["foreground", "card", 4.5],
  ["muted-foreground", "background", 4.5],
  ["muted-foreground", "muted", 4.5],
  ["foreground", "muted", 4.5],
  ["foreground", "accent", 4.5],
  ["primary-foreground", "primary", 4.5],
  ["secondary-foreground", "secondary", 4.5],
  ["header-foreground", "header", 4.5],
  ["header-muted", "header", 4.5],
  ["info-foreground", "info", 4.5],
  ["info", "background", 4.5],
  ["info", "info-soft", 4.5],
  ["success", "success-soft", 4.5],
  ["success", "background", 4.5],
  ["warning", "warning-soft", 4.5],
  ["destructive", "destructive-soft", 4.5],
  ["destructive", "background", 4.5],
  ["destructive-foreground", "destructive", 4.5],
  ["neutral-foreground", "neutral-soft", 4.5],
  ["primary", "background", 4.5],
  ["primary", "card", 4.5],
  ["blue-foreground", "blue", 4.5],
  ["info", "card", 4.5],
  ["ring", "card", 3],
  ["secondary-foreground", "background", 4.5],
  ["foreground", "header", 4.5],
  ["muted-foreground", "accent", 4.5],
  ["success", "card", 4.5],
  ["destructive", "card", 4.5],
  ["input", "background", 3],
  ["input", "card", 3],
  ["ring", "background", 3],
  ["line", "background", 1.4],
];

describe("Contraste dos tokens do Design System", () => {
  it.each(pares)("%s sobre %s passa em %s:1", (texto, fundo, minimo) => {
    expect(contrastRatio(cor(texto), cor(fundo))).toBeGreaterThanOrEqual(minimo);
  });

  it("o azul de preenchimento não serve de texto sobre o fundo escuro", () => {
    // Regra do Design System: o azul da faixa (blue) é fundo com texto branco. Para texto ou
    // link sobre o escuro usa-se a versão clara (info).
    expect(contrastRatio(cor("blue"), cor("background"))).toBeLessThan(4.5);
  });

  it("o laranja serve de texto sobre o escuro, e só ali", () => {
    expect(contrastRatio(cor("primary"), cor("background"))).toBeGreaterThanOrEqual(4.5);
  });
});
