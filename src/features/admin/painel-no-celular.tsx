import { Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

// O evento que o Chrome e o Edge dão quando o painel pode ser instalado. Não existe no Safari
// do iPhone, onde a instalação é manual (veja os passos na tela).
type EventoDeInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const jaEstaInstalado = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(display-mode: standalone)").matches;

export function useInstalarPainel() {
  const [evento, setEvento] = useState<EventoDeInstalacao | null>(null);
  const [instalado, setInstalado] = useState(false);

  useEffect(() => {
    setInstalado(jaEstaInstalado());
    const aoOferecer = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoDeInstalacao);
    };
    const aoInstalar = () => {
      setEvento(null);
      setInstalado(true);
    };
    window.addEventListener("beforeinstallprompt", aoOferecer);
    window.addEventListener("appinstalled", aoInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", aoOferecer);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, []);

  async function instalar() {
    if (!evento) return;
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    if (outcome === "accepted") setInstalado(true);
    setEvento(null);
  }

  return { podeInstalar: evento !== null, instalado, instalar };
}

// Como colocar o painel na tela inicial do celular, como um aplicativo.
export function PainelNoCelular() {
  const { podeInstalar, instalado, instalar } = useInstalarPainel();
  return (
    <div className="grid gap-4 rounded-xl border border-line bg-card p-4 sm:p-5">
      <p className="flex items-center gap-3 text-base">
        <Smartphone aria-hidden="true" className="size-6 shrink-0" />
        {instalado
          ? "Você já está usando o painel instalado neste aparelho."
          : "Deixe o painel na tela inicial do celular: abre em tela cheia, sem o endereço do navegador."}
      </p>
      {podeInstalar && (
        <div>
          <Button onClick={() => void instalar()}>Instalar o painel</Button>
        </div>
      )}
      {!instalado && (
        <ul className="grid gap-2 text-base">
          <li>
            <strong>iPhone (Safari):</strong> toque em Compartilhar e depois em{" "}
            <em>Adicionar à Tela de Início</em>.
          </li>
          <li>
            <strong>Android (Chrome):</strong> toque no menu de três pontos e depois em{" "}
            <em>Instalar app</em> ou <em>Adicionar à tela inicial</em>.
          </li>
        </ul>
      )}
    </div>
  );
}
