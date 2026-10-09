// Mensagens em português para os erros do login (Supabase Auth) e das funções do banco.
// Cada uma diz o que houve e como resolver, sem pedir desculpa.
const erroPadrao = "Algo deu errado. Tente de novo em instantes.";
const semConexao = "Sem conexão. Confira a internet e tente de novo.";

const deLogin: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos. Confira os dados e tente de novo.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar. Procure a mensagem que enviamos.",
  user_already_exists: "Já existe uma conta com esse e-mail. Entre ou recupere a senha.",
  email_exists: "Já existe uma conta com esse e-mail. Entre ou recupere a senha.",
  weak_password: "Senha fraca. Use pelo menos 8 caracteres, com letras e números.",
  same_password: "Escolha uma senha diferente da atual.",
  over_email_send_rate_limit:
    "Enviamos e-mails demais agora. Espere alguns minutos e tente de novo.",
  over_request_rate_limit: "Muitas tentativas. Espere alguns minutos e tente de novo.",
  otp_expired: "Esse link venceu. Peça um novo.",
  bad_code_verifier: "Abra o link no mesmo navegador em que pediu. Se não der, peça um novo.",
  flow_state_not_found: "Esse link já foi usado ou venceu. Peça um novo.",
  flow_state_expired: "Esse link venceu. Peça um novo.",
};

export function mensagemDeLogin(erro: { code?: string | undefined; message?: string }) {
  const conhecida = erro.code ? deLogin[erro.code] : undefined;
  if (conhecida) return conhecida;
  if (erro.message === "Failed to fetch") return semConexao;
  return erroPadrao;
}

const doBanco: Record<string, string> = {
  entre_na_conta: "Entre na sua conta para continuar.",
  perfil_incompleto: "Complete seu nome e celular no perfil para agendar.",
  servico_indisponivel: "Esse serviço não está mais disponível. Escolha outro.",
  horario_indisponivel: "Esse horário acabou de ser reservado. Escolha outro.",
  horario_no_passado: "Esse horário já passou. Escolha outro.",
  horario_longe_demais: "Ainda não abrimos a agenda para essa data. Escolha um dia mais próximo.",
  horario_fora_da_grade: "Esse horário não está disponível. Escolha outro.",
  fora_do_funcionamento: "Esse horário está fora do funcionamento. Escolha outro.",
  horario_bloqueado: "A barbearia não atende nesse horário. Escolha outro.",
  limite_de_agendamentos:
    "Você já tem o máximo de horários marcados. Cancele um para marcar outro.",
  agendamento_inexistente: "Não encontramos esse agendamento.",
  situacao_final: "Esse agendamento não pode mais ser alterado.",
  ja_comecou: "Esse horário já começou e não pode mais ser alterado.",
  dono_nao_pode_excluir: "A conta do dono não pode ser excluída por aqui.",
  sem_permissao: "Você não tem permissão para fazer isso.",
  transicao_invalida: "Essa mudança de situação não é permitida a partir da situação atual.",
  ainda_nao_comecou: "Esse horário ainda não começou. Só dá para marcar falta depois dele.",
  bloqueio_com_agendamento: "Há agendamento nesse período. Remarque ou cancele antes de bloquear.",
  venda_vazia: "Escolha pelo menos um produto.",
  quantidade_invalida: "A quantidade precisa ser de pelo menos 1.",
  produto_indisponivel: "Esse produto não está disponível para venda.",
  desconto_invalido: "O desconto não pode ser maior que o valor da venda.",
  venda_inexistente: "Não encontramos essa venda.",
  ja_estornada: "Essa venda já foi estornada.",
  intervalos_sobrepostos: "Há horários que se sobrepõem no mesmo dia. Ajuste e salve de novo.",
  intervalo_invalido: "Cada horário precisa fechar depois de abrir.",
  intervalos_invalidos: "Não foi possível ler os horários. Recarregue a página e tente de novo.",
};

// O banco levanta exceções com o código como mensagem (raise exception 'horario_indisponivel').
export function mensagemDoBanco(erro: { message?: string }) {
  const codigo = (erro.message ?? "").trim();
  const conhecida = doBanco[codigo];
  if (conhecida) return conhecida;
  if (erro.message === "Failed to fetch") return semConexao;
  return erroPadrao;
}
