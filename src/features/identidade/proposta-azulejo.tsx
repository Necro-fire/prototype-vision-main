import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { rotuloDia } from "@/features/agenda/proximo-horario";
import { Kit, Marca, Status, preco, useProposta, type Cor, type Par } from "./comum";

const cores: Cor[] = [
  { nome: "Louça", hex: "#FFFFFF" },
  { nome: "Gelo", hex: "#EEF4F3" },
  { nome: "Marinho capa", hex: "#12263A" },
  { nome: "Verde azulejo", hex: "#17695A" },
  { nome: "Rejunte", hex: "#C9D3D1" },
  { nome: "Linha de campo", hex: "#6F8581" },
  { nome: "Vermelho poste", hex: "#D93A2B" },
];
const pares: Par[] = [
  { rotulo: "Texto principal", texto: "#12263A", fundo: "#FFFFFF", minimo: 4.5 },
  { rotulo: "Texto secundário", texto: "#4B5E70", fundo: "#FFFFFF", minimo: 4.5 },
  { rotulo: "Botão de ação", texto: "#FFFFFF", fundo: "#17695A", minimo: 4.5 },
  { rotulo: "Link sobre Gelo", texto: "#17695A", fundo: "#EEF4F3", minimo: 4.5 },
  { rotulo: "ON aceso e erro", texto: "#FFFFFF", fundo: "#D93A2B", minimo: 4.5 },
  { rotulo: "Borda de campo e azulejo", texto: "#6F8581", fundo: "#FFFFFF", minimo: 3 },
];

export function PropostaAzulejo() {
  const { agora, servicos, principal, funcionamento, proximo } = useProposta();
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const horarios = proximo?.times.slice(0, 12) ?? [];
  const selecionado = escolhido && horarios.includes(escolhido) ? escolhido : horarios[0];
  return (
    <section className="idp idp-azulejo" id="azulejo" aria-labelledby="azulejo-titulo">
      <div className="idp-in">
        <p className="idp-nome" id="azulejo-titulo">
          Direção B: Azulejo. A parede de azulejo, a louça da pia e a capa de corte.
        </p>
        <header className="idp-topo">
          <Marca ligado={funcionamento?.aberto ?? false} />
          <ul className="idp-menu">
            <li>
              <a href="#azulejo">Serviços</a>
            </li>
            <li>
              <a href="#azulejo">Produtos</a>
            </li>
            <li>
              <a href="#azulejo">Contato</a>
            </li>
          </ul>
          <Link
            to="/agendamento"
            search={{ service: undefined }}
            className="idp-btn idp-btn-primario"
          >
            Agendar horário
          </Link>
        </header>

        <div className="idp-hero">
          <div>
            <Status ligado={funcionamento?.aberto ?? false} texto={funcionamento?.texto} />
            <h1>
              {proximo && agora
                ? `Horários livres ${rotuloDia(proximo.date, agora)}`
                : "Horários livres"}
            </h1>
            {horarios.length > 0 ? (
              <>
                <ul className="idp-azulejos" aria-label="Horários livres">
                  {horarios.map((hora) => (
                    <li key={hora}>
                      <button
                        type="button"
                        className="idp-azulejo-hora"
                        aria-pressed={hora === selecionado}
                        onClick={() => setEscolhido(hora)}
                      >
                        {hora}
                      </button>
                    </li>
                  ))}
                </ul>
                {principal && (
                  <div className="idp-acoes">
                    <Link
                      to="/agendamento"
                      search={{ service: principal.id }}
                      className="idp-btn idp-btn-primario"
                    >
                      Agendar às {selecionado}
                    </Link>
                    <Link
                      to="/agendamento"
                      search={{ service: undefined }}
                      className="idp-btn idp-btn-secundario"
                    >
                      Ver outros dias
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <p className="idp-vazio">
                {agora
                  ? "Sem vaga nos próximos dias. Volte amanhã ou fale com a barbearia."
                  : "Conferindo a agenda"}
              </p>
            )}
          </div>

          <ul className="idp-painel" aria-label="Serviços e preços">
            {servicos.map((servico) => (
              <li key={servico.id}>
                <Link to="/agendamento" search={{ service: servico.id }} className="idp-linha">
                  <span>
                    <strong>{servico.name}</strong>
                    <small>{servico.duration} min</small>
                  </span>
                  <span className="idp-preco">{preco(servico.price)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <Kit
          prefixo="azulejo"
          cores={cores}
          pares={pares}
          fonteTitulo="Gabarito"
          fonteTexto="Hanken Grotesk"
          observacao="Ponto forte: o caminho mais curto até a reserva, com visual calmo e confiável. Risco: é a mais discreta das três e depende de boas fotos para ter calor."
        />
      </div>
    </section>
  );
}
