import { SectionTitle } from "@/components/ui/section-title";

// Os três passos do agendamento. Aqui a numeração faz sentido: é uma sequência.
const passos = [
  { titulo: "Escolha o serviço", texto: "Veja o preço e quanto tempo leva." },
  { titulo: "Escolha o dia e o horário", texto: "Só aparecem os horários livres." },
  { titulo: "Pague na barbearia", texto: "Sem cobrança antecipada." },
];

export function ComoFunciona() {
  return (
    <section
      aria-labelledby="como-funciona"
      className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16"
    >
      <SectionTitle id="como-funciona">Como marcar em três passos</SectionTitle>
      <ol className="grid divide-y divide-line border-y border-line md:grid-cols-3 md:divide-x md:divide-y-0">
        {passos.map((passo, i) => (
          <li key={passo.titulo} className="grid gap-3 py-6 md:px-6 md:first:pl-0 md:last:pr-0">
            <span
              aria-hidden="true"
              className="font-display text-7xl font-semibold leading-none text-primary"
            >
              {i + 1}
            </span>
            <h3 className="text-2xl font-bold leading-tight">{passo.titulo}</h3>
            <p className="text-base text-muted-foreground">{passo.texto}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
