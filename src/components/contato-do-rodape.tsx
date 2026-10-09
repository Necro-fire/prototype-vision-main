import { AtSign, MapPin, MessageCircle, Phone } from "lucide-react";
import type { ReactNode } from "react";

import type { Contato } from "@/features/contato/banco";
import {
  linkDoInstagram,
  linkDoMapa,
  linkDoTelefone,
  linkDoWhatsapp,
} from "@/features/contato/links";

const linkDoRodape =
  "inline-flex min-h-11 items-center gap-2.5 font-semibold text-header-foreground underline underline-offset-4 hover:no-underline";

// Os dados que a barbearia informou, no rodapé de todas as páginas.
// Campo vazio não aparece, e sem nenhum dado o bloco some.
export function ContatoDoRodape({ contato }: { contato: Contato | null }) {
  if (!contato) return null;
  const { endereco, telefone, whatsapp, instagram } = contato;
  if (!endereco && !telefone && !whatsapp && !instagram) return null;

  return (
    <ul aria-label="Contato da barbearia" className="grid gap-0.5 text-base">
      {endereco && (
        <Item
          icone={<MapPin aria-hidden="true" className="size-5 shrink-0" />}
          href={linkDoMapa(endereco)}
          externo
        >
          {endereco}
        </Item>
      )}
      {telefone && (
        <Item
          icone={<Phone aria-hidden="true" className="size-5 shrink-0" />}
          href={linkDoTelefone(telefone)}
        >
          {telefone}
        </Item>
      )}
      {whatsapp && (
        <Item
          icone={<MessageCircle aria-hidden="true" className="size-5 shrink-0" />}
          href={linkDoWhatsapp(whatsapp)}
          externo
        >
          WhatsApp {whatsapp}
        </Item>
      )}
      {instagram && (
        <Item
          icone={<AtSign aria-hidden="true" className="size-5 shrink-0" />}
          href={linkDoInstagram(instagram)}
          externo
        >
          {instagram}
        </Item>
      )}
    </ul>
  );
}

// Com link quando o dado é válido; sem link, o texto aparece mesmo assim, sem fingir que é tocável.
function Item({
  icone,
  href,
  externo = false,
  children,
}: {
  icone: ReactNode;
  href: string | null;
  externo?: boolean;
  children: ReactNode;
}) {
  if (!href) {
    return (
      <li className="inline-flex min-h-11 items-center gap-2.5 text-header-muted">
        {icone}
        {children}
      </li>
    );
  }
  return (
    <li>
      <a
        href={href}
        className={linkDoRodape}
        target={externo ? "_blank" : undefined}
        rel={externo ? "noreferrer" : undefined}
      >
        {icone}
        {children}
      </a>
    </li>
  );
}
