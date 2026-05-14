import { requestApi } from './api.service.js';

export function criarChamadoTI(payload) {
  return requestApi('criar-chamado-ti', {
    solicitanteId:    String(payload.solicitanteId    || ''),
    solicitanteNome:  String(payload.solicitanteNome  || ''),
    solicitanteSetor: String(payload.solicitanteSetor || ''),
    unidade:          String(payload.unidade          || ''),
    categoria:        String(payload.categoria        || ''),
    descricao:        String(payload.descricao        || ''),
  });
}

export function listarChamadosTI(period = 'mes') {
  return requestApi('listar-chamados-ti', { period });
}

export function atualizarStatusChamadoTI(ticketId, novoStatus, usuarioId, usuarioNome, observacao) {
  return requestApi('atualizar-chamado-ti', {
    ticketId:    String(ticketId    || ''),
    novoStatus:  String(novoStatus  || ''),
    usuarioId:   String(usuarioId   || ''),
    usuarioNome: String(usuarioNome || ''),
    observacao:  String(observacao  || ''),
  });
}
