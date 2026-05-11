import { BRIDGE_MESSAGE_TYPES, BRIDGE_REQUEST_TIMEOUTS } from '../config/app.config.js';
import { requestAppsScriptBridge } from './gas-bridge.service.js';

export function criarChamadoTI(payload) {
  return requestAppsScriptBridge({
    action: 'criar-chamado-ti',
    fields: {
      solicitanteId:    String(payload.solicitanteId    || ''),
      solicitanteNome:  String(payload.solicitanteNome  || ''),
      solicitanteSetor: String(payload.solicitanteSetor || ''),
      unidade:          String(payload.unidade           || ''),
      categoria:        String(payload.categoria         || ''),
      descricao:        String(payload.descricao         || ''),
    },
    messageType: BRIDGE_MESSAGE_TYPES.modules,
    requestIdPrefix: 'ti-create',
    iframeNamePrefix: 'build-connect-ti-create-iframe',
    timeoutMs: BRIDGE_REQUEST_TIMEOUTS.modules,
    timeoutMessage: 'O registro do chamado demorou mais que o esperado.',
    bridgeLoadErrorMessage: 'Não foi possível registrar o chamado de TI.',
    webAppUrlErrorMessage: 'URL do Web App não configurada.',
  });
}

export function listarChamadosTI(period = 'mes') {
  return requestAppsScriptBridge({
    action: 'listar-chamados-ti',
    fields: { period },
    messageType: BRIDGE_MESSAGE_TYPES.modules,
    requestIdPrefix: 'ti-list',
    iframeNamePrefix: 'build-connect-ti-list-iframe',
    timeoutMs: BRIDGE_REQUEST_TIMEOUTS.modules,
    timeoutMessage: 'A listagem dos chamados demorou mais que o esperado.',
    bridgeLoadErrorMessage: 'Não foi possível listar os chamados de TI.',
    webAppUrlErrorMessage: 'URL do Web App não configurada.',
  });
}

export function atualizarStatusChamadoTI(ticketId, novoStatus, usuarioId, usuarioNome, observacao) {
  return requestAppsScriptBridge({
    action: 'atualizar-chamado-ti',
    fields: {
      ticketId:    String(ticketId    || ''),
      novoStatus:  String(novoStatus  || ''),
      usuarioId:   String(usuarioId   || ''),
      usuarioNome: String(usuarioNome || ''),
      observacao:  String(observacao  || ''),
    },
    messageType: BRIDGE_MESSAGE_TYPES.modules,
    requestIdPrefix: 'ti-update',
    iframeNamePrefix: 'build-connect-ti-update-iframe',
    timeoutMs: BRIDGE_REQUEST_TIMEOUTS.modules,
    timeoutMessage: 'A atualização do chamado demorou mais que o esperado.',
    bridgeLoadErrorMessage: 'Não foi possível atualizar o status do chamado.',
    webAppUrlErrorMessage: 'URL do Web App não configurada.',
  });
}
