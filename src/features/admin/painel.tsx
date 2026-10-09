import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Agendamentos } from "./agendamentos";
import { Alertas } from "./alertas";
import { Avaliacoes } from "./avaliacoes";
import { CaixaDoDia } from "./caixa";
import { Catalogo } from "./catalogo";
import { Clientes } from "./clientes";
import { Configuracoes } from "./configuracoes";
import { Descontos } from "./descontos";
import { Financeiro } from "./financeiro";
import { PaginaAdmin } from "./pagina-admin";
import { Relatorios } from "./relatorios";
import { Vendas } from "./vendas";
import { VisaoGeral } from "./visao-geral";

export function AdminPanel({ module = "dashboard" }: { module?: string }) {
  switch (module) {
    case "dashboard":
      return <VisaoGeral />;
    case "agendamentos":
      return <Agendamentos />;
    case "servicos":
    case "produtos":
      return <Catalogo module={module} />;
    case "clientes":
      return <Clientes />;
    case "vendas":
      return <Vendas />;
    case "caixa":
      return <CaixaDoDia />;
    case "descontos":
      return <Descontos />;
    case "financeiro":
      return <Financeiro />;
    case "avaliacoes":
      return <Avaliacoes />;
    case "relatorios":
      return <Relatorios />;
    case "alertas":
      return <Alertas />;
    case "configuracoes":
      return <Configuracoes />;
    default:
      return (
        <PaginaAdmin module={module}>
          <div className="admin-empty">
            <h2>Módulo não encontrado.</h2>
            <Button asChild>
              <Link to="/admin">Voltar à visão geral</Link>
            </Button>
          </div>
        </PaginaAdmin>
      );
  }
}
