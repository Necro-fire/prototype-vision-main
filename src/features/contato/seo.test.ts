import { describe, expect, it } from "vitest";

import type { Expediente } from "@/features/agenda/expediente";
import type { Contato } from "./banco";
import { dadosDeNegocioLocal, jsonParaScript } from "./seo";

const contato: Contato = {
  nome: "ON-STYLE",
  endereco: "Rua das Estrelas, 123 - Centro",
  telefone: "(11) 3333-4444",
  whatsapp: "(11) 99999-9999",
  instagram: "onstyle",
};

const expediente: Expediente = {
  fuso: "America/Sao_Paulo",
  gradeMinutos: 30,
  antecedenciaMaxDias: 30,
  porDia: [
    [],
    [
      { abre: "09:00", fecha: "12:00" },
      { abre: "13:00", fecha: "19:00" },
    ],
    [{ abre: "09:00", fecha: "19:00" }],
    [],
    [],
    [],
    [],
  ],
};

describe("dadosDeNegocioLocal", () => {
  it("monta nome, endereço, telefone, horários e Instagram do que o dono cadastrou", () => {
    const d = dadosDeNegocioLocal({ contato, expediente, urlDoSite: "https://onstyle.com.br" });
    expect(d).toMatchObject({
      "@context": "https://schema.org",
      "@type": "HairSalon",
      name: "ON-STYLE",
      url: "https://onstyle.com.br",
      telephone: "+551133334444",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Rua das Estrelas, 123 - Centro",
        addressCountry: "BR",
      },
      sameAs: ["https://www.instagram.com/onstyle/"],
    });
  });

  it("um item de horário por intervalo, com o almoço como intervalo entre dois", () => {
    const d = dadosDeNegocioLocal({ contato, expediente })!;
    expect(d["openingHoursSpecification"]).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Monday",
        opens: "09:00",
        closes: "12:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Monday",
        opens: "13:00",
        closes: "19:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Tuesday",
        opens: "09:00",
        closes: "19:00",
      },
    ]);
  });

  it("o que o dono não informou simplesmente não aparece", () => {
    const d = dadosDeNegocioLocal({
      contato: {
        nome: "ON-STYLE",
        endereco: null,
        telefone: null,
        whatsapp: null,
        instagram: null,
      },
      expediente: null,
    })!;
    expect(Object.keys(d).sort()).toEqual(["@context", "@type", "name"]);
  });

  it("sem telefone fixo, usa o WhatsApp; telefone inválido é ignorado", () => {
    expect(
      dadosDeNegocioLocal({ contato: { ...contato, telefone: null }, expediente: null })![
        "telephone"
      ],
    ).toBe("+5511999999999");
    expect(
      dadosDeNegocioLocal({
        contato: { ...contato, telefone: "123", whatsapp: null },
        expediente: null,
      })!,
    ).not.toHaveProperty("telephone");
  });

  it("sem dados de contato (leitura falhou), não publica nada", () => {
    expect(dadosDeNegocioLocal({ contato: null, expediente })).toBeNull();
  });
});

describe("jsonParaScript", () => {
  it("texto cadastrado não consegue fechar a tag script", () => {
    const texto = jsonParaScript({ name: "</script><script>alert(1)</script>" });
    expect(texto).not.toContain("</script>");
    expect(JSON.parse(texto.replaceAll("\\u003c", "<")).name).toBe(
      "</script><script>alert(1)</script>",
    );
  });
});
