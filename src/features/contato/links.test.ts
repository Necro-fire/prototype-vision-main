import { describe, expect, it } from "vitest";

import { linkDoInstagram, linkDoMapa, linkDoTelefone, linkDoWhatsapp } from "./links";

describe("links de contato", () => {
  it("telefone vira tel: com o código do país", () => {
    expect(linkDoTelefone("(11) 91234-5678")).toBe("tel:+5511912345678");
    expect(linkDoTelefone("+55 11 3456-7890")).toBe("tel:+551134567890");
    expect(linkDoTelefone("1234")).toBeNull();
  });

  it("WhatsApp vira wa.me, sem duplicar o 55", () => {
    expect(linkDoWhatsapp("(11) 91234-5678")).toBe("https://wa.me/5511912345678");
    expect(linkDoWhatsapp("5511912345678")).toBe("https://wa.me/5511912345678");
    expect(linkDoWhatsapp("abc")).toBeNull();
  });

  it("Instagram só com usuário válido", () => {
    expect(linkDoInstagram("onstyle.barbearia")).toBe(
      "https://www.instagram.com/onstyle.barbearia/",
    );
    expect(linkDoInstagram("on style")).toBeNull();
    expect(linkDoInstagram("")).toBeNull();
  });

  it("mapa codifica o endereço", () => {
    expect(linkDoMapa(" Rua das Flores, 10 - Centro ")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Rua%20das%20Flores%2C%2010%20-%20Centro",
    );
    expect(linkDoMapa("   ")).toBeNull();
  });
});
