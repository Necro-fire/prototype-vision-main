import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/section-title";
import type { AvaliacoesPublicas } from "@/features/avaliacoes/banco";
import { Estrelas, ResumoDaNota } from "@/features/avaliacoes/estrelas";
import { escolherDepoimentos } from "./selecao";

// `dados` é nulo quando a leitura no banco falhou: a seção some, sem erro na cara de quem chega.
export function Depoimentos({ dados }: { dados: AvaliacoesPublicas | null }) {
  if (!dados) return null;
  const { resumo } = dados;
  const depoimentos = escolherDepoimentos(dados.avaliacoes);
  const temNota = resumo.total > 0 && resumo.media !== null;

  return (
    <section
      aria-labelledby="depoimentos"
      className="mx-auto grid w-full max-w-6xl gap-10 px-5 pb-16"
    >
      <div className="grid items-end gap-6 sm:grid-cols-[1fr_auto]">
        <SectionTitle id="depoimentos">O que os clientes dizem</SectionTitle>
        {temNota && resumo.media !== null && (
          <ResumoDaNota media={resumo.media} total={resumo.total} tamanho="lg" />
        )}
      </div>

      {depoimentos.length > 0 ? (
        <ul className="grid gap-8 md:grid-cols-3">
          {depoimentos.map((a) => (
            <li
              key={`${a.criadaEm}-${a.autor}`}
              className="grid content-start gap-3 border-l-2 border-primary pl-5"
            >
              <Estrelas nota={a.nota} />
              <blockquote className="text-lg">{a.comentario}</blockquote>
              <p className="text-base font-bold">{a.autor}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid justify-items-start gap-4 border border-dashed border-line p-6">
          <p className="text-lg">Ainda não há avaliações. A sua pode ser a primeira.</p>
          <Button asChild>
            <Link to="/agendamento" search={{ service: undefined }}>
              Agendar horário
            </Link>
          </Button>
        </div>
      )}

      {temNota && (
        <div>
          <Button asChild variant="outline">
            <Link to="/avaliacoes">Ver todas as avaliações</Link>
          </Button>
        </div>
      )}
    </section>
  );
}
