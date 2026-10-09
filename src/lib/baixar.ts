// Entrega um texto como arquivo para o navegador baixar. O BOM no começo faz o Excel abrir os
// acentos certos num CSV em UTF-8.
export function baixarArquivo(nome: string, conteudo: string, tipo = "text/csv") {
  const blob = new Blob(["﻿", conteudo], { type: `${tipo};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
