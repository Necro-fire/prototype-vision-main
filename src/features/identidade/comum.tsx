// Peças compartilhadas pelas três propostas de identidade (página temporária /identidade).
// Quando a direção for escolhida, esta pasta é removida e a escolhida vira o site.
import { createContext, useContext, useEffect, useState } from "react";
import { abertoAgora } from "@/features/agenda/funcionamento";
import { proximosHorarios } from "@/features/agenda/proximo-horario";
import { useShop } from "@/features/demo/shop-provider";
import { contrastRatio } from "@/lib/contraste";
import { money } from "@/lib/dinheiro";

export type Cor = { nome: string; hex: string };
export type Par = { rotulo: string; texto: string; fundo: string; minimo: 3 | 4.5 };

// Permite ver o ON aceso e apagado a qualquer hora, só nesta página de comparação.
export type Simulacao = "real" | "aberto" | "fechado";
export const SimulacaoContexto = createContext<Simulacao>("real");

function momentoSimulado(simulacao: Simulacao, agora: Date, dias: number[], abertura: number) {
  if (simulacao === "real") return agora;
  const dia = new Date(agora);
  if (simulacao === "fechado") {
    dia.setHours(23, 0, 0, 0);
    return dia;
  }
  for (let passo = 0; passo < 7 && !dias.includes(dia.getDay()); passo++) {
    dia.setDate(dia.getDate() + 1);
  }
  dia.setHours(abertura, 30, 0, 0);
  return dia;
}

export const preco = (valor: number) => money(valor).replace(",00", "");

// Dados reais do protótipo (serviços, horário de funcionamento, agenda), lidos só no navegador
// para o "aberto agora" e o próximo horário não divergirem entre servidor e cliente.
export function useProposta() {
  const { services, bookings, hours } = useShop();
  const simulacao = useContext(SimulacaoContexto);
  const [agora, setAgora] = useState<Date | null>(null);
  useEffect(() => setAgora(new Date()), []);
  const servicos = services.filter((s) => s.active);
  const principal = servicos[0];
  return {
    agora,
    servicos,
    principal,
    funcionamento: agora
      ? abertoAgora(hours, momentoSimulado(simulacao, agora, hours.days, hours.open))
      : null,
    proximo:
      agora && principal ? proximosHorarios(principal.duration, bookings, hours, agora) : null,
  };
}

// O "ON" da marca fica aceso quando a barbearia está aberta.
export function Marca({ ligado }: { ligado: boolean }) {
  return (
    <span className="idp-marca">
      <span className="idp-on" data-ligado={ligado}>
        ON
      </span>
      <span>-STYLE</span>
    </span>
  );
}

export function Status({ ligado, texto }: { ligado: boolean; texto: string | undefined }) {
  return (
    <p className="idp-status" data-ligado={ligado}>
      {texto ?? "Conferindo se estamos abertos"}
    </p>
  );
}

export function Kit({
  prefixo,
  cores,
  pares,
  fonteTitulo,
  fonteTexto,
  observacao,
}: {
  prefixo: string;
  cores: Cor[];
  pares: Par[];
  fonteTitulo: string;
  fonteTexto: string;
  observacao: string;
}) {
  return (
    <div className="idp-kit">
      <section aria-labelledby={`${prefixo}-paleta`}>
        <h3 id={`${prefixo}-paleta`}>Cores</h3>
        <ul className="idp-cores">
          {cores.map((cor) => (
            <li key={cor.hex}>
              <span className="idp-amostra" style={{ background: cor.hex }} aria-hidden="true" />
              <span>
                {cor.nome}
                <small>{cor.hex}</small>
              </span>
            </li>
          ))}
        </ul>
        <h4>Contraste dos pares usados</h4>
        <ul className="idp-pares">
          {pares.map((par) => {
            const razao = contrastRatio(par.texto, par.fundo);
            const passa = razao >= par.minimo;
            return (
              <li key={par.rotulo}>
                <span
                  className="idp-par"
                  style={{ color: par.texto, background: par.fundo }}
                  aria-hidden="true"
                >
                  Aa
                </span>
                <span>
                  {par.rotulo}
                  <small>
                    {razao.toFixed(1).replace(".", ",")}:1, mínimo{" "}
                    {String(par.minimo).replace(".", ",")}:1
                    {passa ? "" : " (não passa)"}
                  </small>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
      <section aria-labelledby={`${prefixo}-tipos`}>
        <h3 id={`${prefixo}-tipos`}>Tipografia</h3>
        <p className="idp-tipo-titulo">Corte + barba</p>
        <p className="idp-tipo-preco">R$ 70</p>
        <p className="idp-tipo-corpo">
          O cuidado completo para quem quer sair da cadeira com o corte e a barba em dia. Dura uma
          hora, e você paga na barbearia.
        </p>
        <p className="idp-tipo-nota">
          Títulos: {fonteTitulo}. Texto: {fonteTexto}.
        </p>
        <p className="idp-tipo-nota">{observacao}</p>
      </section>
      <section aria-labelledby={`${prefixo}-controles`}>
        <h3 id={`${prefixo}-controles`}>Componentes</h3>
        <div className="idp-controles">
          <button type="button" className="idp-btn idp-btn-primario">
            Confirmar agendamento
          </button>
          <button type="button" className="idp-btn idp-btn-secundario">
            Escolher outro dia
          </button>
          <button type="button" className="idp-btn idp-btn-primario" disabled>
            Escolha um horário
          </button>
          <div className="idp-campo">
            <label htmlFor={`${prefixo}-celular`}>Celular com DDD</label>
            <input
              id={`${prefixo}-celular`}
              type="tel"
              inputMode="tel"
              defaultValue="11 9999"
              aria-invalid="true"
              aria-describedby={`${prefixo}-erro`}
            />
            <p className="idp-erro" id={`${prefixo}-erro`}>
              Faltam números. Digite o DDD e os 9 dígitos, por exemplo (11) 99999-9999.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
