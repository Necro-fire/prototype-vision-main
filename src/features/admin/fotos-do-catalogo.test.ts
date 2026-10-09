import { beforeEach, describe, expect, it, vi } from "vitest";

import { apagarFoto, caminhoDaFoto, enviarFoto, gravarComFoto } from "./fotos-do-catalogo";

const storage = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
  nomeDoBucket: "",
}));
vi.mock("@/lib/supabase-navegador", () => ({
  supabaseNavegador: () => ({
    storage: {
      from: (bucket: string) => {
        storage.nomeDoBucket = bucket;
        return {
          upload: storage.upload,
          remove: storage.remove,
          getPublicUrl: (caminho: string) => ({
            data: {
              publicUrl: `https://projeto.supabase.co/storage/v1/object/public/${bucket}/${caminho}`,
            },
          }),
        };
      },
    },
  }),
}));

const BASE = "https://projeto.supabase.co/storage/v1/object/public/catalogo";
const imagem = (tipo = "image/webp") => new File(["x"], "foto", { type: tipo });

beforeEach(() => {
  storage.upload.mockReset().mockResolvedValue({ error: null });
  storage.remove.mockReset().mockResolvedValue({ error: null });
});

describe("caminhoDaFoto", () => {
  it("tira o caminho do arquivo do endereço público", () => {
    expect(caminhoDaFoto(`${BASE}/servicos/a.webp`)).toBe("servicos/a.webp");
    expect(caminhoDaFoto(`${BASE}/servicos/a%20b.webp?t=1`)).toBe("servicos/a b.webp");
  });

  it("endereço de fora do catálogo, ou vazio, não vira caminho (nunca se apaga o que não é nosso)", () => {
    expect(caminhoDaFoto(null)).toBeNull();
    expect(caminhoDaFoto("")).toBeNull();
    expect(caminhoDaFoto("/fotos/cadeira-em-sala-clara-960.webp")).toBeNull();
    expect(caminhoDaFoto("https://outro.com/object/public/avatar/x.png")).toBeNull();
    expect(caminhoDaFoto(`${BASE}/`)).toBeNull();
  });
});

describe("enviarFoto", () => {
  it("envia para a pasta com nome novo, com o tipo certo, e devolve o endereço público", async () => {
    const url = await enviarFoto("produtos", imagem("image/png"));
    const [caminho, , opcoes] = storage.upload.mock.calls[0]!;
    expect(caminho).toMatch(/^produtos\/[0-9a-f-]{36}\.png$/);
    expect(opcoes).toMatchObject({ contentType: "image/png" });
    expect(storage.nomeDoBucket).toBe("catalogo");
    expect(url).toBe(`${BASE}/${caminho}`);
  });

  it("cada envio ganha um nome diferente, para a foto antiga não ficar no cache", async () => {
    const a = await enviarFoto("servicos", imagem());
    const b = await enviarFoto("servicos", imagem());
    expect(a).not.toBe(b);
  });

  it("arquivo inválido nem chega ao Storage", async () => {
    await expect(enviarFoto("servicos", imagem("application/pdf"))).rejects.toThrow(
      "Use uma foto JPG, PNG ou WebP.",
    );
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("falha do Storage vira mensagem em português, sem o texto cru", async () => {
    storage.upload.mockResolvedValue({ error: { message: "StorageApiError: bucket not found" } });
    await expect(enviarFoto("servicos", imagem())).rejects.toThrow(
      "Não conseguimos enviar a foto. Tente de novo.",
    );
  });
});

describe("apagarFoto", () => {
  it("apaga o arquivo do catálogo", async () => {
    await apagarFoto(`${BASE}/servicos/a.webp`);
    expect(storage.remove).toHaveBeenCalledWith(["servicos/a.webp"]);
  });

  it("não apaga nada de fora do catálogo", async () => {
    await apagarFoto("/fotos/cadeira-em-sala-clara-960.webp");
    await apagarFoto(null);
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it("erro ao apagar não atrapalha quem chamou", async () => {
    storage.remove.mockRejectedValue(new Error("rede"));
    await expect(apagarFoto(`${BASE}/servicos/a.webp`)).resolves.toBeUndefined();
  });
});

describe("gravarComFoto", () => {
  const antiga = `${BASE}/servicos/antiga.webp`;

  it("manter: grava sem mexer na foto e não toca no Storage", async () => {
    const gravar = vi.fn().mockResolvedValue(undefined);
    await gravarComFoto("servicos", { tipo: "manter" }, antiga, gravar);
    expect(gravar).toHaveBeenCalledWith(undefined);
    expect(storage.upload).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it("trocar: envia, grava o endereço novo e depois apaga a antiga", async () => {
    const ordem: string[] = [];
    storage.upload.mockImplementation(async () => {
      ordem.push("envia");
      return { error: null };
    });
    storage.remove.mockImplementation(async () => {
      ordem.push("apaga");
      return { error: null };
    });
    const gravar = vi.fn(async () => {
      ordem.push("grava");
    });
    await gravarComFoto("servicos", { tipo: "trocar", arquivo: imagem() }, antiga, gravar);
    expect(ordem).toEqual(["envia", "grava", "apaga"]);
    expect(storage.remove).toHaveBeenCalledWith(["servicos/antiga.webp"]);
  });

  it("remover: grava nulo e apaga a antiga", async () => {
    const gravar = vi.fn().mockResolvedValue(undefined);
    await gravarComFoto("servicos", { tipo: "remover" }, antiga, gravar);
    expect(gravar).toHaveBeenCalledWith(null);
    expect(storage.remove).toHaveBeenCalledWith(["servicos/antiga.webp"]);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("gravação falhou: descarta a foto nova, mantém a antiga e repassa o erro", async () => {
    const gravar = vi.fn().mockRejectedValue(new Error("banco fora do ar"));
    await expect(
      gravarComFoto("servicos", { tipo: "trocar", arquivo: imagem() }, antiga, gravar),
    ).rejects.toThrow("banco fora do ar");
    const enviado = storage.upload.mock.calls[0]![0] as string;
    expect(storage.remove).toHaveBeenCalledTimes(1);
    expect(storage.remove).toHaveBeenCalledWith([enviado]);
  });

  it("sem foto antiga, trocar não tenta apagar nada", async () => {
    await gravarComFoto("produtos", { tipo: "trocar", arquivo: imagem() }, null, vi.fn());
    expect(storage.remove).not.toHaveBeenCalled();
  });
});
