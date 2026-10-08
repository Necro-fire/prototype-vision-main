import { createFileRoute } from "@tanstack/react-router";
import { ShopLayout } from "@/components/shop-layout";
import { ServiceList } from "@/components/service-list";
export const Route = createFileRoute("/servicos")({
  component: Services,
  head: () => ({
    meta: [
      { title: "Serviços — Slick Barbearia" },
      {
        name: "description",
        content:
          "Cortes, barba, tratamentos, sobrancelha e FreeStyle. Encontre seu próximo cuidado na Slick.",
      },
      { property: "og:title", content: "Serviços — Slick Barbearia" },
      { property: "og:description", content: "Conheça nosso ofício e escolha seu serviço." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
function Services() {
  return (
    <ShopLayout>
      <section className="section-wrap catalog-page">
        <span className="eyebrow">PRECISÃO. PERSONALIDADE. CUIDADO.</span>
        <h1>
          NOSSO <span className="text-primary">OFÍCIO.</span>
        </h1>
        <p className="page-intro">Escolha seu ritual. Deixe o resto com a gente.</p>
        <ServiceList filters />
      </section>
    </ShopLayout>
  );
}
