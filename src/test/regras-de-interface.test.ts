// Trava as regras de legibilidade do Design System (docs/03-design-system.md): nenhum texto
// abaixo de 14px e nenhuma confirmação do navegador. Roda em todo `npm run verificar`.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = join(process.cwd(), "src");
const MINIMO_PX = 14;

// Arquivos gerados, fora da regra.
const ignorados = ["routeTree.gen.ts"];

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho];
  });
}

const codigo = arquivos(raiz)
  .filter((caminho) => /\.(tsx?|css)$/.test(caminho))
  .filter((caminho) => !/\.test\.tsx?$/.test(caminho))
  .filter((caminho) => !ignorados.some((nome) => caminho.endsWith(nome)))
  .map((caminho) => ({
    nome: relative(raiz, caminho).replaceAll("\\", "/"),
    texto: readFileSync(caminho, "utf8"),
  }));

const emPx = (valor: number, unidade: string) => (unidade === "rem" ? valor * 16 : valor);

function achados(regex: RegExp, pegarPx: (casamento: RegExpExecArray) => number | null) {
  const problemas: string[] = [];
  for (const { nome, texto } of codigo) {
    for (const casamento of texto.matchAll(new RegExp(regex, "g"))) {
      const px = pegarPx(casamento as RegExpExecArray);
      if (px !== null && px < MINIMO_PX) problemas.push(`${nome}: ${casamento[0]}`);
    }
  }
  return problemas;
}

describe("Regras de interface", () => {
  it("não usa text-xs (12px)", () => {
    const problemas = codigo.filter(({ texto }) => /(^|[\s"'`:])text-xs\b/.test(texto));
    expect(problemas.map((arquivo) => arquivo.nome)).toEqual([]);
  });

  it("não usa tamanho de texto arbitrário abaixo de 14px no Tailwind", () => {
    const problemas = achados(/text-\[([\d.]+)(px|rem)\]/, (c) => emPx(Number(c[1]), c[2] ?? "px"));
    expect(problemas).toEqual([]);
  });

  it("não declara font-size abaixo de 14px no CSS", () => {
    const problemas = achados(/font-size:\s*([\d.]+)(px|rem)/, (c) =>
      emPx(Number(c[1]), c[2] ?? "px"),
    );
    expect(problemas).toEqual([]);
  });

  it("não usa a confirmação do navegador (usar o diálogo do sistema)", () => {
    const problemas = codigo.filter(({ texto }) => /window\.confirm|[^.\w]confirm\(/.test(texto));
    expect(problemas.map((arquivo) => arquivo.nome)).toEqual([]);
  });
});
