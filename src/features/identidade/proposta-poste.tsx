import { Link } from "@tanstack/react-router";
import { Kit, Marca, Status, preco, useProposta, type Cor, type Par } from "./comum";

const cores: Cor[] = [
  { nome: "Marinho noite", hex: "#0F1B33" },
  { nome: "Marinho raso", hex: "#182A4D" },
  { nome: "Branco", hex: "#F5F7FA" },
  { nome: "Névoa", hex: "#9FB3D1" },
  { nome: "Vermelho poste", hex: "#D42A22" },
  { nome: "Azul poste", hex: "#2458E0" },
  { nome: "Azul claro", hex: "#7FA6FF" },
  { nome: "Rosa de erro", hex: "#FF9A92" },
];
const pares: Par[] = [
  { rotulo: "Texto principal", texto: "#F5F7FA", fundo: "#0F1B33", minimo: 4.5 },
  { rotulo: "Texto secundário", texto: "#9FB3D1", fundo: "#0F1B33", minimo: 4.5 },
  { rotulo: "Botão de ação e ON aceso", texto: "#FFFFFF", fundo: "#D42A22", minimo: 4.5 },
  { rotulo: "Seleção", texto: "#FFFFFF", fundo: "#2458E0", minimo: 4.5 },
  { rotulo: "Link sobre Marinho raso", texto: "#7FA6FF", fundo: "#182A4D", minimo: 4.5 },
  { rotulo: "Erro", texto: "#FF9A92", fundo: "#0F1B33", minimo: 4.5 },
  { rotulo: "Borda de campo", texto: "#9FB3D1", fundo: "#0F1B33", minimo: 3 },
  { rotulo: "Azul poste como texto ou borda", texto: "#2458E0", fundo: "#0F1B33", minimo: 3 },
];

export function PropostaPoste() {
  const { servicos, funcionamento } = useProposta();
  const ligado = funcionamento?.aberto ?? false;
  return (
    <section className="idp idp-poste" id="poste" aria-labelledby="poste-titulo">
      <div className="idp-listras" aria-hidden="true" />
      <div className="idp-in">
        <p className="idp-nome" id="poste-titulo">
          Direção C: Poste. O poste listrado de barbeiro, à noite.
        </p>
        <header className="idp-topo">
          <span className="idp-site">ON-STYLE</span>
          <ul className="idp-menu">
            <li>
              <a href="#poste">Serviços</a>
            </li>
            <li>
              <a href="#poste">Produtos</a>
            </li>
            <li>
              <a href="#poste">Contato</a>
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

        <h1 className="idp-grande">
          <Marca ligado={ligado} grande />
        </h1>

        <div className="idp-hero">
          <div>
            <Status ligado={ligado} texto={funcionamento?.texto} />
            <p className="idp-chamada">Corte, barba e sobrancelha. Escolha o serviço e marque.</p>
            <Link
              to="/agendamento"
              search={{ service: undefined }}
              className="idp-btn idp-btn-primario"
            >
              Agendar horário
            </Link>
          </div>

          <ul className="idp-lista" aria-label="Serviços e preços">
            {servicos.map((servico) => (
              <li key={servico.id}>
                <Link to="/agendamento" search={{ service: servico.id }} className="idp-linha">
                  <span>
                    <strong>{servico.name}</strong>
                    {servico.id === "3" && <span className="idp-tag">Mais pedido</span>}
                    <small>{servico.duration} min</small>
                  </span>
                  <span className="idp-preco">{preco(servico.price)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <Kit
          prefixo="poste"
          cores={cores}
          pares={pares}
          fonteTitulo="Archivo, largura expandida"
          fonteTexto="Archivo, largura normal"
          observacao="Ponto forte: a mais marcante e a que menos rompe com o protótipo atual. Risco: fundo escuro lê pior ao ar livre e combina menos com acessível. O azul poste só serve de preenchimento com texto branco; como texto ou borda sobre o fundo escuro ele não passa."
        />
      </div>
    </section>
  );
}
