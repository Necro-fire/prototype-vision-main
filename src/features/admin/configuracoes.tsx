import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShop } from "@/features/demo/shop-provider";
import { PaginaAdmin } from "./pagina-admin";

export function Configuracoes() {
  const shop = useShop();
  const [hours, setHours] = useState(shop.hours);
  const [message, setMessage] = useState("");
  return (
    <PaginaAdmin module="configuracoes" message={message} onCloseMessage={() => setMessage("")}>
      <div className="settings-layout">
        <section>
          <h2>Horário de funcionamento</h2>
          <p>A disponibilidade da agenda acompanha estes horários.</p>
          <div className="settings-time">
            <label>
              Abertura
              <select
                value={hours.open}
                onChange={(e) => setHours({ ...hours, open: Number(e.target.value) })}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option value={h} key={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fechamento
              <select
                value={hours.close}
                onChange={(e) => setHours({ ...hours, close: Number(e.target.value) })}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option value={h + 1} key={h}>
                    {String(h + 1).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field-label">Dias de atendimento</label>
          <div className="days-selector">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, i) => (
              <Button
                key={d}
                variant="outline"
                className={hours.days.includes(i) ? "selected" : ""}
                onClick={() =>
                  setHours({
                    ...hours,
                    days: hours.days.includes(i)
                      ? hours.days.filter((day) => day !== i)
                      : [...hours.days, i].sort(),
                  })
                }
              >
                {d}
              </Button>
            ))}
          </div>
          <Button
            onClick={() => {
              if (hours.close <= hours.open) {
                setMessage("O fechamento deve ser depois da abertura.");
                return;
              }
              shop.setHours(hours);
              setMessage("Horários atualizados nesta sessão.");
            }}
          >
            Salvar horários <Check />
          </Button>
        </section>
        <section>
          <h2>Perfil da empresa</h2>
          <div className="review-row">
            <span>Nome</span>
            <strong>Slick Barbearia</strong>
          </div>
          <div className="review-row">
            <span>Contato</span>
            <strong>A definir</strong>
          </div>
          <p className="demo-note">
            Marca e horários de demonstração. Cadastro, recuperação de senha e permissões reais não
            estão conectados.
          </p>
          <h2>Suporte</h2>
          <p>Os canais de suporte serão definidos pela empresa.</p>
        </section>
      </div>
    </PaginaAdmin>
  );
}
