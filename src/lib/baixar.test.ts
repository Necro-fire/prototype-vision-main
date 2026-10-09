import { afterEach, describe, expect, it, vi } from "vitest";

import { baixarArquivo } from "./baixar";

afterEach(() => {
  vi.restoreAllMocks();
});

const lerBytes = (blob: Blob) =>
  new Promise<ArrayBuffer>((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result as ArrayBuffer);
    leitor.onerror = () => reject(leitor.error);
    leitor.readAsArrayBuffer(blob);
  });

describe("baixarArquivo", () => {
  it("entrega o texto como arquivo com o nome pedido, em UTF-8 com BOM, e solta o endereço depois", async () => {
    let blobCriado: Blob | undefined;
    const criar = vi.fn((blob: Blob) => {
      blobCriado = blob;
      return "blob:teste";
    });
    const soltar = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: criar, revokeObjectURL: soltar });
    const cliques: { href: string; download: string }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      cliques.push({ href: this.href, download: this.download });
    });

    baixarArquivo("faturamento.csv", "Dia;Total\r\n");

    expect(cliques).toEqual([{ href: "blob:teste", download: "faturamento.csv" }]);
    expect(blobCriado?.type).toBe("text/csv;charset=utf-8");
    expect(document.querySelector("a[download]")).toBeNull();
    expect(soltar).not.toHaveBeenCalled(); // só solta depois de o navegador pegar o arquivo
    const bytes = new Uint8Array(await lerBytes(blobCriado!));
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // BOM do UTF-8
    expect(new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes)).toBe("\ufeffDia;Total\r\n");
    await vi.waitFor(() => expect(soltar).toHaveBeenCalledWith("blob:teste"));
    vi.unstubAllGlobals();
  });
});
