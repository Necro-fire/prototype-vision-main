import * as React from "react";

import { cn } from "@/lib/utils";

// Campo de texto: 48px de altura, borda de 2px com 3:1 de contraste ou mais.
export const campoClasses =
  "flex min-h-12 w-full rounded-md border-2 border-input bg-card px-3.5 py-2 text-base text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-destructive";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return <input type={type} className={cn(campoClasses, className)} ref={ref} {...props} />;
  },
);
Input.displayName = "Input";

export { Input };
