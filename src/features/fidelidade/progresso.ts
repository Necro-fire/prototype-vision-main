// Cartão fidelidade (regra F7): um ponto por atendimento concluído; a cada N pontos, um serviço
// escolhido pelo dono sai de graça. O banco guarda os pontos e confere o resgate; aqui só se
// transforma o saldo no que a tela mostra.
export type ProgressoDoCartao = {
  saldo: number;
  porPremio: number; // N
  carimbos: number; // quantos quadrados estão preenchidos (no máximo N)
  faltam: number; // atendimentos até o próximo prêmio (0 se já pode resgatar)
  premiosDisponiveis: number; // quantos resgates o saldo permite
  podeResgatar: boolean;
};

export function progressoDoCartao(saldo: number, porPremio: number): ProgressoDoCartao {
  const seguro = Math.max(0, Math.floor(saldo));
  const premiosDisponiveis = Math.floor(seguro / porPremio);
  const podeResgatar = premiosDisponiveis >= 1;
  return {
    saldo: seguro,
    porPremio,
    carimbos: podeResgatar ? porPremio : seguro,
    faltam: podeResgatar ? 0 : porPremio - seguro,
    premiosDisponiveis,
    podeResgatar,
  };
}
