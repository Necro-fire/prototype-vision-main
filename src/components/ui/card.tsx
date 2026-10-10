import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Cartão do sistema: superfície elevada com filete. Sem sombra: o degrau de cor e o contorno
// bastam. `destaque` põe uma régua laranja no alto (o cartão que a tela quer que se veja
// primeiro); `fundo` é o degrau abaixo, para listas dentro de cartões.
const cardVariants = cva("rounded-md border bg-card text-card-foreground", {
  variants: {
    tom: {
      padrao: "border-line",
      destaque: "border-line border-t-2 border-t-primary",
      fundo: "border-border bg-muted",
    },
    espaco: {
      nenhum: "",
      normal: "p-5",
      amplo: "p-6 sm:p-8",
    },
  },
  defaultVariants: { tom: "padrao", espaco: "nenhum" },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, tom, espaco, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ tom, espaco }), className)} {...props} />
  ),
);
Card.displayName = "Card";

export { Card };
