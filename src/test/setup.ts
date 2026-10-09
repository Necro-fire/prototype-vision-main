import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

// Com muitos testes de tela em paralelo, o computador (ou o GitHub) demora mais de 1 s para
// desenhar uma tela. O limite padrão do findBy/waitFor derrubava testes corretos.
configure({ asyncUtilTimeout: 5000 });

// Os testes do banco (supabase/testes) rodam em Node puro, sem `window`.
if (typeof window !== "undefined") {
  Object.defineProperty(window, "scrollTo", {
    writable: true,
    value: () => {},
  });

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
}
