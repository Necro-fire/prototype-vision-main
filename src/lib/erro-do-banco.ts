import { mensagemDoBanco } from "@/features/conta/mensagens";

// Erro de uma função do banco: a mensagem já vem em português, e o código diz o que aconteceu.
export class ErroDoBanco extends Error {
  readonly codigo: string;
  constructor(codigo: string, mensagem: string) {
    super(mensagem);
    this.name = "ErroDoBanco";
    this.codigo = codigo;
  }
}

// Falha do banco vira ErroDoBanco, com o código e a mensagem em português.
export function falhou(erro: { message: string }): never {
  throw new ErroDoBanco(erro.message.trim(), mensagemDoBanco(erro));
}
