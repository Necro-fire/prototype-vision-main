import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ArrowRight, Scissors, Star, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShopLayout } from "@/components/shop-layout";
import { ServiceList } from "@/components/service-list";
import { ProductList } from "@/components/product-list";
import { fotos } from "@/assets/fotos";
const hero = { url: fotos.barbaTesoura };
const craft = { url: fotos.acabamentoNavalha };
export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Slick Barbearia — Seu estilo. Nosso ofício." },
      {
        name: "description",
        content:
          "Corte, barba e cuidado de verdade. Conheça os serviços da Slick e reserve seu próximo horário.",
      },
      { property: "og:title", content: "Slick Barbearia — Seu estilo. Nosso ofício." },
      {
        property: "og:description",
        content: "Tradição no ofício. Personalidade no estilo. Agende na Slick Barbearia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
function Index() {
  return (
    <ShopLayout>
      <section className="hero">
        <img
          className="hero-image"
          src={hero.url}
          alt="Barbeiro aparando com tesoura a barba de um cliente"
          fetchPriority="high"
        />
        <div className="hero-shade" />
        <div className="hero-content">
          <div className="eyebrow">
            <span />
            TRADIÇÃO NO OFÍCIO. PERSONALIDADE NO ESTILO.
          </div>
          <h1>
            SLICK<span className="text-primary">.</span>
            <br />
            SEU ESTILO,
            <br />
            <span className="outline-type">SEM FILTRO.</span>
          </h1>
          <p>
            Mais do que um corte. Um momento seu.
            <br />
            Cuidado de verdade, do primeiro traço ao último detalhe.
          </p>
          <Button asChild className="hero-cta">
            <Link to="/agendamento" search={{ service: undefined }}>
              RESERVE SUA CADEIRA <ArrowUpRight />
            </Link>
          </Button>
          <div className="hero-caption">
            <span className="tiny-rule" />
            FEITO À MÃO. FEITO PRA VOCÊ.
          </div>
        </div>
        <div className="hero-vertical">BARBEARIA & ESTILO — SLICK</div>
        <a href="#servicos" className="hero-scroll">
          EXPLORE <ArrowRight size={16} />
        </a>
      </section>
      <div className="value-strip">
        <span>
          <Scissors /> Corte com personalidade
        </span>
        <span>
          <Star /> Cuidado em cada detalhe
        </span>
        <span>
          <Clock /> Seu tempo respeitado
        </span>
        <span className="strip-last">
          ESTILO NÃO SE IMPROVISA. <ArrowUpRight />
        </span>
      </div>
      <section id="servicos" className="section-wrap services-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">O BÁSICO, EXTRAORDINARIAMENTE BEM FEITO</span>
            <h2>
              NOSSO <span className="text-primary">OFÍCIO.</span>
            </h2>
          </div>
          <Link to="/servicos" className="text-link">
            Todos os serviços <ArrowUpRight size={18} />
          </Link>
        </div>
        <ServiceList />
      </section>
      <section className="craft-section">
        <div className="craft-image">
          <img
            src={craft.url}
            alt="Barbeiro realizando acabamento de corte com pente e navalha"
            loading="lazy"
          />
          <span className="photo-tag">PRECISÃO EM CADA TRAÇO.</span>
        </div>
        <div className="craft-copy">
          <span className="eyebrow">A ESSÊNCIA DA SLICK</span>
          <h2>
            NÃO É SÓ
            <br />
            SOBRE <span className="text-primary">CABELO.</span>
          </h2>
          <p>
            É sobre chegar, desacelerar e sair se sentindo você. Unimos o cuidado da barbearia
            tradicional a um olhar contemporâneo para o seu estilo.
          </p>
          <p>Aqui, a técnica é nossa. A personalidade é sua.</p>
          <Button variant="outline" asChild>
            <Link to="/agendamento" search={{ service: undefined }}>
              Viva a experiência <ArrowUpRight />
            </Link>
          </Button>
          <div className="craft-signature">
            Slick<span>BARBEARIA & ESTILO</span>
          </div>
        </div>
      </section>
      <section className="section-wrap products-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">O CUIDADO CONTINUA EM CASA</span>
            <h2>
              SELEÇÃO <span className="text-primary">SLICK.</span>
            </h2>
          </div>
          <Link to="/produtos" className="text-link">
            Ver catálogo <ArrowUpRight size={18} />
          </Link>
        </div>
        <ProductList />
      </section>
      <section className="booking-band">
        <Scissors size={36} />
        <div>
          <span>O PRÓXIMO CORTE TEM A SUA ASSINATURA.</span>
          <h2>SUA CADEIRA ESTÁ ESPERANDO.</h2>
        </div>
        <Button asChild variant="secondary">
          <Link to="/agendamento" search={{ service: undefined }}>
            Agendar meu horário <ArrowUpRight />
          </Link>
        </Button>
      </section>
      <section className="visit-section section-wrap">
        <div>
          <span className="eyebrow">BORA TROCAR UMA IDEIA?</span>
          <h2>
            CHEGA <span className="text-primary">MAIS.</span>
          </h2>
        </div>
        <div className="visit-detail">
          <Clock />
          <div>
            <strong>Um tempo só seu</strong>
            <p>Segunda a sábado · 09h às 19h*</p>
          </div>
        </div>
        <div className="visit-detail">
          <MapPin />
          <div>
            <strong>A gente se encontra aqui</strong>
            <Link to="/contato">
              Conheça nossos canais <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </ShopLayout>
  );
}
