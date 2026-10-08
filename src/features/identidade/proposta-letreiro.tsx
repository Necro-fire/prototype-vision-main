import { Link } from "@tanstack/react-router";
import { rotuloDia } from "@/features/agenda/proximo-horario";
import { Kit, Marca, Status, preco, useProposta, type Cor, type Par } from "./comum";

const coresClaro: Cor[] = [
  { nome: "Cal", hex: "#FDFDFB" },
  { nome: "Preto", hex: "#131416" },
  { nome: "Laranja", hex: "#FF7A1A" },
  { nome: "Laranja queimado", hex: "#B34700" },
  { nome: "Azul", hex: "#2B4FD9" },
  { nome: "Cimento", hex: "#5F6672" },
  { nome: "Vermelho de erro", hex: "#B42318" },
];
const paresClaro: Par[] = [
  { rotulo: "Texto principal", texto: "#131416", fundo: "#FDFDFB", minimo: 4.5 },
  { rotulo: "Botão de ação e ON aceso", texto: "#131416", fundo: "#FF7A1A", minimo: 4.5 },
  { rotulo: "Faixa preta do cabeçalho", texto: "#FFFFFF", fundo: "#131416", minimo: 4.5 },
  { rotulo: "Texto secundário", texto: "#5F6672", fundo: "#FDFDFB", minimo: 4.5 },
  { rotulo: "Laranja queimado, destaque", texto: "#B34700", fundo: "#FDFDFB", minimo: 4.5 },
  { rotulo: "Azul, links", texto: "#2B4FD9", fundo: "#FDFDFB", minimo: 4.5 },
  { rotulo: "Etiqueta azul", texto: "#FFFFFF", fundo: "#2B4FD9", minimo: 4.5 },
  { rotulo: "Erro", texto: "#B42318", fundo: "#FDFDFB", minimo: 4.5 },
  { rotulo: "Borda de campo", texto: "#5F6672", fundo: "#FDFDFB", minimo: 3 },
  { rotulo: "Laranja como texto (não usar)", texto: "#FF7A1A", fundo: "#FDFDFB", minimo: 4.5 },
];

const coresEscuro: Cor[] = [
  { nome: "Preto", hex: "#111214" },
  { nome: "Grafite", hex: "#1B1D21" },
  { nome: "Osso", hex: "#F6F4F1" },
  { nome: "Chumbo", hex: "#A8ADB5" },
  { nome: "Laranja", hex: "#FF7A1A" },
  { nome: "Azul", hex: "#2F5BEA" },
  { nome: "Azul claro", hex: "#7C9CFF" },
  { nome: "Linha de campo", hex: "#8A9099" },
  { nome: "Rosa de erro", hex: "#FF8A7A" },
];
const paresEscuro: Par[] = [
  { rotulo: "Texto principal", texto: "#F6F4F1", fundo: "#111214", minimo: 4.5 },
  { rotulo: "Texto secundário", texto: "#A8ADB5", fundo: "#1B1D21", minimo: 4.5 },
  { rotulo: "Botão de ação e ON aceso", texto: "#111214", fundo: "#FF7A1A", minimo: 4.5 },
  { rotulo: "Laranja como destaque", texto: "#FF7A1A", fundo: "#111214", minimo: 4.5 },
  { rotulo: "Azul claro, links", texto: "#7C9CFF", fundo: "#1B1D21", minimo: 4.5 },
  { rotulo: "Etiqueta azul", texto: "#FFFFFF", fundo: "#2F5BEA", minimo: 4.5 },
  { rotulo: "Erro", texto: "#FF8A7A", fundo: "#111214", minimo: 4.5 },
  { rotulo: "Borda de campo", texto: "#8A9099", fundo: "#111214", minimo: 3 },
];

export function PropostaLetreiro({ escuro = false }: { escuro?: boolean }) {
  const { agora, servicos, principal, funcionamento, proximo } = useProposta();
  const id = escuro ? "letreiro-escuro" : "letreiro-claro";
  const horario = proximo?.times[0];
  const ligado = funcionamento?.aberto ?? false;
  return (
    <section
      className={`idp idp-letreiro ${escuro ? "idp-letreiro-escuro" : ""}`}
      id={id}
      aria-labelledby={`${id}-titulo`}
    >
      <div className="idp-in idp-in-nome">
        <p className="idp-nome" id={`${id}-titulo`}>
          {escuro
            ? "Letreiro escuro. Fundo preto, o laranja acende o que importa."
            : "Letreiro claro. Fundo claro, faixa preta no alto, o laranja acende o que importa."}
        </p>
      </div>
      <div className="idp-faixa">
        <div className="idp-in idp-in-topo">
          <header className="idp-topo">
            <Marca ligado={ligado} />
            <ul className="idp-menu">
              <li>
                <a href={`#${id}`}>Serviços</a>
              </li>
              <li>
                <a href={`#${id}`}>Produtos</a>
              </li>
              <li>
                <a href={`#${id}`}>Contato</a>
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
        </div>
      </div>

      <div className="idp-in">
        <div className="idp-hero">
          <div>
            <Status ligado={ligado} texto={funcionamento?.texto} />
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
                <div className="idp-acoes">
                  <Link
                    to="/agendamento"
                    search={{ service: principal.id }}
                    className="idp-btn idp-btn-primario"
                  >
                    Agendar às {horario}
                  </Link>
                  <Link to="/agendamento" search={{ service: undefined }} className="idp-link">
                    Ver outros dias
                  </Link>
                </div>
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
          prefixo={id}
          cores={escuro ? coresEscuro : coresClaro}
          pares={escuro ? paresEscuro : paresClaro}
          fonteTitulo="Bricolage Grotesque"
          fonteTexto="Figtree"
          observacao={
            escuro
              ? "Ponto forte: o laranja brilha sobre o preto e o site parece a placa acesa à noite. Risco: fundo escuro lê pior ao ar livre, na tela do celular sob sol."
              : "Ponto forte: legível sob sol, e a faixa preta e as bordas dão o peso de placa pintada. Risco: o laranja só pode ser fundo com texto preto; como texto sobre o claro ele não passa, e para isso existe o laranja queimado."
          }
        />
      </div>
    </section>
  );
}
