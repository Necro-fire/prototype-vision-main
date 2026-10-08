import { useState } from "react";
import "./identidade.css";
import { SimulacaoContexto, type Simulacao } from "./comum";
import { PropostaLetreiro } from "./proposta-letreiro";

const estados: { valor: Simulacao; rotulo: string }[] = [
  { valor: "real", rotulo: "Hora real" },
  { valor: "aberto", rotulo: "Aberta" },
  { valor: "fechado", rotulo: "Fechada" },
];

export function PaginaIdentidade({
  estadoInicial,
}: {
  estadoInicial: "aberto" | "fechado" | undefined;
}) {
  const [simulacao, setSimulacao] = useState<Simulacao>(estadoInicial ?? "real");
  return (
    <SimulacaoContexto.Provider value={simulacao}>
      <div className="idp-page">
        <div className="idp-intro">
          <h1>Letreiro em laranja, preto e azul: claro ou escuro?</h1>
          <p>
            Abaixo, a abertura da página inicial nas duas versões, com os serviços, os preços e a
            agenda do protótipo. O horário livre e o &ldquo;aberto agora&rdquo; são calculados na
            hora, a partir do que está configurado no painel. Os botões levam ao agendamento de
            verdade.
          </p>
          <p>
            O &ldquo;ON&rdquo; do nome acende em laranja quando a barbearia está aberta e apaga
            quando está fechada. O laranja é sempre um fundo com texto preto; o azul aparece só em
            pequenos pontos: links, etiquetas e o foco do teclado.
          </p>
          <div className="idp-seletor" role="group" aria-label="Estado da barbearia">
            <span>Ver a barbearia:</span>
            {estados.map((estado) => (
              <button
                key={estado.valor}
                type="button"
                aria-pressed={simulacao === estado.valor}
                onClick={() => setSimulacao(estado.valor)}
              >
                {estado.rotulo}
              </button>
            ))}
          </div>
          <ul className="idp-atalhos">
            <li>
              <a href="#letreiro-claro">Letreiro claro</a>
            </li>
            <li>
              <a href="#letreiro-escuro">Letreiro escuro</a>
            </li>
          </ul>
        </div>
        <PropostaLetreiro />
        <PropostaLetreiro escuro />
      </div>
    </SimulacaoContexto.Provider>
  );
}
