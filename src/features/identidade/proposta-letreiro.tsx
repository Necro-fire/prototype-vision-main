import { Link } from "@tanstack/react-router";
import { rotuloDia } from "@/features/agenda/proximo-horario";
import { Kit, Marca, Status, preco, useProposta, type Cor, type Par } from "./comum";

const cores: Cor[] = [
  { nome: "Cal", hex: "#FDFDFB" },
  { nome: "Tinta", hex: "#16181D" },
  { nome: "Azul placa", hex: "#1F3FBF" },
  { nome: "Amarelo gema", hex: "#FFC42E" },
  { nome: "Cimento", hex: "#5F6672" },
  { nome: "Tijolo", hex: "#C8321E" },
];
const pares: Par[] = [
  { rotulo: "Texto principal", texto: "#16181D", fundo: "#FDFDFB", minimo: 4.5 },
  { rotulo: "Botão de ação", texto: "#FFFFFF", fundo: "#1F3FBF", minimo: 4.5 },
  { rotulo: "ON aceso e destaques", texto: "#16181D", fundo: "#FFC42E", minimo: 4.5 },
  { rotulo: "Texto secundário", texto: "#5F6672", fundo: "#FDFDFB", minimo: 4.5 },
  { rotulo: "Erro", texto: "#C8321E", fundo: "#FDFDFB", minimo: 4.5 },
  { rotulo: "Borda de campo", texto: "#5F6672", fundo: "#FDFDFB", minimo: 3 },
];

export function PropostaLetreiro() {
  const { agora, servicos, principal, funcionamento, proximo } = useProposta();
  const horario = proximo?.times[0];
  return (
    <section className="idp idp-letreiro" id="letreiro" aria-labelledby="letreiro-titulo">
      <div className="idp-in">
        <p className="idp-nome" id="letreiro-titulo">
          Direção A: Letreiro. A placa pintada na fachada e a tabela de preços na parede.
        </p>
        <header className="idp-topo">
          <Marca ligado={funcionamento?.aberto ?? false} />
          <ul className="idp-menu">
            <li>
              <a href="#letreiro">Serviços</a>
            </li>
            <li>
              <a href="#letreiro">Produtos</a>
            </li>
            <li>
              <a href="#letreiro">Contato</a>
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
            <h1>Escolha o serviço, veja o preço e marque em um minuto.</h1>
            <div className="idp-proximo">
              <p>
                {proximo && principal && agora
                  ? `Próximo horário para ${principal.name.toLowerCase()}`
                  : "Próximo horário"}
              </p>
              <strong>
                {proximo && horario && agora
                  ? `${rotuloDia(proximo.date, agora)}, ${horario}`
                  : agora
                    ? "Sem vaga nos próximos dias"
                    : "Conferindo a agenda"}
              </strong>
              {proximo && horario && principal && (
                <Link
                  to="/agendamento"
                  search={{ service: principal.id }}
                  className="idp-btn idp-btn-primario"
                >
                  Agendar às {horario}
                </Link>
              )}
            </div>
          </div>

          <ul className="idp-tabela" aria-label="Serviços e preços">
            {servicos.map((servico) => (
              <li key={servico.id}>
                <Link to="/agendamento" search={{ service: servico.id }} className="idp-linha">
                  <span>
                    <strong>{servico.name}</strong>
                    {servico.id === "3" && <span className="idp-tag">Mais pedido</span>}
                    <small>{servico.duration} min</small>
                  </span>
                  <span className="idp-pontos" aria-hidden="true" />
                  <span className="idp-preco">{preco(servico.price)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <Kit
          prefixo="letreiro"
          cores={cores}
          pares={pares}
          fonteTitulo="Bricolage Grotesque"
          fonteTexto="Figtree"
          observacao="Ponto forte: é a que mais se parece com uma barbearia de bairro e funciona sob sol na tela do celular. Risco: azul e amarelo são fortes, então o amarelo precisa aparecer pouco."
        />
      </div>
    </section>
  );
}
