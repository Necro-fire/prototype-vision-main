// Dados de negócio local para buscadores (schema.org, em JSON-LD): nome, endereço, telefone e
// horário de atendimento da barbearia, tirados do que o dono cadastrou. Função pura.
import type { Expediente } from "@/features/agenda/expediente";
import { normalizePhone } from "@/lib/telefone";
import type { Contato } from "./banco";
import { linkDoInstagram } from "./links";

const diasEmIngles = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function dadosDeNegocioLocal({
  contato,
  expediente,
  urlDoSite,
}: {
  contato: Contato | null;
  expediente: Expediente | null;
  urlDoSite?: string | undefined;
}): Record<string, unknown> | null {
  if (!contato) return null;
  const telefone = [contato.telefone, contato.whatsapp]
    .map((numero) => (numero ? normalizePhone(numero) : ""))
    .find((digitos) => /^\d{10,11}$/.test(digitos));
  const instagram = contato.instagram ? linkDoInstagram(contato.instagram) : null;
  const horarios = (expediente?.porDia ?? []).flatMap((intervalos, dia) =>
    intervalos.map((i) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: diasEmIngles[dia],
      opens: i.abre,
      closes: i.fecha,
    })),
  );
  return {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: contato.nome,
    ...(urlDoSite ? { url: urlDoSite } : {}),
    ...(telefone ? { telephone: `+55${telefone}` } : {}),
    ...(contato.endereco
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: contato.endereco,
            addressCountry: "BR",
          },
        }
      : {}),
    ...(horarios.length > 0 ? { openingHoursSpecification: horarios } : {}),
    ...(instagram ? { sameAs: [instagram] } : {}),
  };
}

// JSON dentro de <script>: "<" vira < para que nenhum texto cadastrado feche a tag.
export const jsonParaScript = (dados: unknown) => JSON.stringify(dados).replaceAll("<", "\\u003c");
