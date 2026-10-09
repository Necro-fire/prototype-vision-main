import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Input } from "@/components/ui/input";

// Campo de senha com botão para mostrar e ocultar o que foi digitado.
export function CampoDeSenha({
  id,
  rotulo,
  valor,
  aoMudar,
  autoComplete,
  ajuda,
  erro,
}: {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  autoComplete: "current-password" | "new-password";
  ajuda?: string;
  erro?: string | undefined;
}) {
  const [visivel, setVisivel] = useState(false);
  return (
    <Campo id={id} rotulo={rotulo} {...(ajuda ? { ajuda } : {})} {...(erro ? { erro } : {})}>
      {(props) => (
        <div className="relative">
          <Input
            {...props}
            type={visivel ? "text" : "password"}
            autoComplete={autoComplete}
            className="pr-14"
            value={valor}
            onChange={(e) => aoMudar(e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0.5 top-0.5"
            aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={visivel}
            onClick={() => setVisivel(!visivel)}
          >
            {visivel ? <EyeOff /> : <Eye />}
          </Button>
        </div>
      )}
    </Campo>
  );
}
