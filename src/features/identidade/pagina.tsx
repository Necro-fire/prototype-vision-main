import { useState } from "react";
import "./identidade.css";
import { SimulacaoContexto, type Simulacao } from "./comum";
import { PropostaAzulejo } from "./proposta-azulejo";
import { PropostaLetreiro } from "./proposta-letreiro";
import { PropostaPoste } from "./proposta-poste";

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
          <h1>Três direções para a ON-STYLE</h1>
          <p>
            Cada direção abaixo é a abertura da página inicial, com os serviços, os preços e a
            agenda do protótipo. O horário livre e o &ldquo;aberto agora&rdquo; são calculados na
            hora, a partir do que está configurado no painel. Os botões levam ao agendamento de
            verdade.
          </p>
          <p>
            O &ldquo;ON&rdquo; do nome acende quando a barbearia está aberta e apaga quando está
            fechada. É o que as três têm em comum. O que muda é o resto: cor, letra e o que vem
            primeiro na tela.
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
              <a href="#letreiro">A: Letreiro</a>
            </li>
            <li>
              <a href="#azulejo">B: Azulejo</a>
            </li>
            <li>
              <a href="#poste">C: Poste</a>
            </li>
          </ul>
        </div>
        <PropostaLetreiro />
        <PropostaAzulejo />
        <PropostaPoste />
      </div>
    </SimulacaoContexto.Provider>
  );
}
