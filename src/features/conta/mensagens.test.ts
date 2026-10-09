import { describe, expect, it } from "vitest";

import { mensagemDeLogin, mensagemDoBanco } from "./mensagens";

const PADRAO = "Algo deu errado. Tente de novo em instantes.";

describe("mensagemDeLogin", () => {
  it("traduz os erros que o cliente vê", () => {
    expect(mensagemDeLogin({ code: "invalid_credentials" })).toMatch(/incorretos/);
    expect(mensagemDeLogin({ code: "email_not_confirmed" })).toMatch(/Confirme seu e-mail/);
    expect(mensagemDeLogin({ code: "user_already_exists" })).toMatch(/Já existe uma conta/);
    expect(mensagemDeLogin({ code: "over_email_send_rate_limit" })).toMatch(/Espere/);
  });

  it("sem conexão", () => {
    expect(mensagemDeLogin({ message: "Failed to fetch" })).toMatch(/Sem conexão/);
  });

  it("erro desconhecido não vaza texto técnico em inglês", () => {
    expect(mensagemDeLogin({ code: "algo_novo", message: "Database error saving user" })).toBe(
      PADRAO,
    );
  });
});

describe("mensagemDoBanco", () => {
  it("traduz todos os códigos que o site pode receber ao reservar, remarcar e cancelar", () => {
    const codigos = [
      "entre_na_conta",
      "perfil_incompleto",
      "servico_indisponivel",
      "horario_indisponivel",
      "horario_no_passado",
      "horario_longe_demais",
      "horario_fora_da_grade",
      "fora_do_funcionamento",
      "horario_bloqueado",
      "limite_de_agendamentos",
      "agendamento_inexistente",
      "situacao_final",
      "ja_comecou",
      "dono_nao_pode_excluir",
      "sem_permissao",
      "transicao_invalida",
      "ainda_nao_comecou",
      "bloqueio_com_agendamento",
      "venda_vazia",
      "quantidade_invalida",
      "produto_indisponivel",
      "desconto_invalido",
      "venda_inexistente",
      "ja_estornada",
      "intervalos_sobrepostos",
      "intervalo_invalido",
      "intervalos_invalidos",
    ];
    for (const codigo of codigos) {
      expect(mensagemDoBanco({ message: codigo }), codigo).not.toBe(PADRAO);
    }
  });

  it("a mensagem do conflito de horário diz o que fazer", () => {
    expect(mensagemDoBanco({ message: "horario_indisponivel" })).toBe(
      "Esse horário acabou de ser reservado. Escolha outro.",
    );
  });

  it("código desconhecido cai na mensagem padrão", () => {
    expect(mensagemDoBanco({ message: "violates something" })).toBe(PADRAO);
  });
});
