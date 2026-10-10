import { Link } from "@tanstack/react-router";

import { Foto } from "@/components/foto";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/section-title";

// Quem é a barbearia, sem inventar história: o que o sistema garante (um barbeiro, uma agenda,
// preço à vista). O texto é do dono para trocar quando quiser.
export function Sobre() {
  return (
    <section
      aria-labelledby="sobre"
      className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pb-16 lg:grid-cols-12 lg:gap-12"
    >
      <div className="lg:col-span-5">
        <Foto
          arquivo="cadeira-em-sala-clara"
          alt="Cadeira de barbeiro preta, vista de costas, em uma sala clara."
          sizes="(min-width: 64rem) 28rem, calc(100vw - 2.5rem)"
          className="aspect-4/5 rounded-md object-[68%_50%]"
        />
      </div>
      <div className="grid content-center gap-6 lg:col-span-6 lg:col-start-7">
        <SectionTitle id="sobre">Um barbeiro, uma agenda</SectionTitle>
        <div className="grid max-w-[52ch] gap-4 text-lg text-muted-foreground">
          <p>
            A ON-STYLE é uma barbearia de bairro, com um barbeiro e uma única agenda. Por isso o
            horário que aparece livre está mesmo livre.
          </p>
          <p>
            O preço aparece antes de você marcar. Você paga na barbearia, depois do atendimento, e
            nada é cobrado antes.
          </p>
        </div>
        <div>
          <Button asChild variant="outline">
            <Link to="/contato">Como chegar</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
