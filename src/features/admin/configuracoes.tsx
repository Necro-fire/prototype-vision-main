import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { NativeSelect } from "@/components/ui/native-select";
import { useShop } from "@/features/demo/shop-provider";
import { cn } from "@/lib/utils";
import { SecaoAdmin } from "./componentes";
import { PaginaAdmin } from "./pagina-admin";

const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function Configuracoes() {
  const shop = useShop();
  const [hours, setHours] = useState(shop.hours);
  const [message, setMessage] = useState("");
  const [erro, setErro] = useState("");
  return (
    <PaginaAdmin module="configuracoes" message={message} onCloseMessage={() => setMessage("")}>
      <div className="grid gap-8 lg:grid-cols-[3fr_2fr] lg:items-start">
        <SecaoAdmin titulo="Horário de funcionamento">
          <p className="text-base text-muted-foreground">
            A agenda do site mostra só os horários dentro destes limites.
          </p>
          <div className="grid gap-4 rounded-md border-2 border-foreground bg-card p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo id="abertura" rotulo="Abertura">
                {(props) => (
                  <NativeSelect
                    {...props}
                    value={hours.open}
                    onChange={(e) => setHours({ ...hours, open: Number(e.target.value) })}
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option value={h} key={h}>
                        {String(h).padStart(2, "0")}:00
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </Campo>
              <Campo id="fechamento" rotulo="Fechamento" {...(erro ? { erro } : {})}>
                {(props) => (
                  <NativeSelect
                    {...props}
                    value={hours.close}
                    onChange={(e) => setHours({ ...hours, close: Number(e.target.value) })}
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option value={h + 1} key={h}>
                        {String(h + 1).padStart(2, "0")}:00
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </Campo>
            </div>
            <div className="grid gap-2">
              <p id="rotulo-dias" className="text-base font-semibold">
                Dias de atendimento
              </p>
              <div role="group" aria-labelledby="rotulo-dias" className="flex flex-wrap gap-2">
                {dias.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={hours.days.includes(i)}
                    onClick={() =>
                      setHours({
                        ...hours,
                        days: hours.days.includes(i)
                          ? hours.days.filter((day) => day !== i)
                          : [...hours.days, i].sort(),
                      })
                    }
                    className={cn(
                      "min-h-11 min-w-14 cursor-pointer rounded-md border-2 px-3 text-base font-bold transition-colors",
                      hours.days.includes(i)
                        ? "border-foreground bg-foreground text-background"
                        : "border-input bg-card hover:bg-muted",
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Button
                onClick={() => {
                  if (hours.close <= hours.open) {
                    setErro("O fechamento precisa ser depois da abertura.");
                    return;
                  }
                  setErro("");
                  shop.setHours(hours);
                  setMessage("Horários atualizados nesta sessão.");
                }}
              >
                Salvar horários
              </Button>
            </div>
          </div>
        </SecaoAdmin>

        <SecaoAdmin titulo="Dados da barbearia">
          <dl className="divide-y divide-border rounded-md border-2 border-foreground bg-card">
            {[
              ["Nome", "ON-STYLE"],
              ["Endereço", "A definir"],
              ["Telefone", "A definir"],
            ].map(([rotulo, valor]) => (
              <div key={rotulo} className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-muted-foreground">{rotulo}</dt>
                <dd className="font-semibold">{valor}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-muted-foreground">
            Estes dados passam a ser editáveis na Fase 4. Hoje são de demonstração, e o login e as
            permissões reais ainda não estão conectados.
          </p>
        </SecaoAdmin>
      </div>
    </PaginaAdmin>
  );
}
