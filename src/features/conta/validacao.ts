import { normalizePhone } from "@/lib/telefone";

export const SENHA_MINIMA = 8;

// Cada função devolve a mensagem de erro, ou undefined quando o valor serve.
export function validarEmail(email: string) {
  const valor = email.trim();
  if (!valor) return "Informe seu e-mail.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) return "Confira o e-mail: faltou algo.";
  return undefined;
}

export function validarSenha(senha: string) {
  if (!senha) return "Crie uma senha.";
  if (senha.length < SENHA_MINIMA) return `Use pelo menos ${SENHA_MINIMA} caracteres.`;
  return undefined;
}

export function validarNome(nome: string) {
  return nome.trim().length < 2 ? "Informe seu nome." : undefined;
}

export function validarCelular(celular: string) {
  return /^\d{10,11}$/.test(normalizePhone(celular))
    ? undefined
    : "Informe o celular com DDD, por exemplo 11 91234-5678.";
}

// Só aceita caminho do próprio site. Impede que o link de login mande a pessoa para outro
// endereço depois de entrar ("//outro.com", "https://outro.com", "/\outro.com").
export function caminhoSeguro(valor: unknown, padrao = "/cliente") {
  if (typeof valor !== "string") return padrao;
  if (!valor.startsWith("/") || valor.startsWith("//") || valor.includes("\\")) return padrao;
  return valor;
}

// O parâmetro ?voltar= de uma rota: caminho seguro do próprio site, ou nada.
export function voltarDaBusca(busca: Record<string, unknown>) {
  const valor = caminhoSeguro(busca["voltar"], "");
  return valor === "" ? undefined : valor;
}
