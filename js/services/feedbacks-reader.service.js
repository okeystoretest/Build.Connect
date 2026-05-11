import { BRIDGE_MESSAGE_TYPES, BRIDGE_REQUEST_TIMEOUTS } from '../config/app.config.js';
import { requestAppsScriptBridge } from './gas-bridge.service.js';

export function listarFeedbacksParaUsuario(usuarioId) {
  return requestAppsScriptBridge({
    action: 'listar-feedbacks-usuario',
    fields: { usuarioId: String(usuarioId || '') },
    messageType: BRIDGE_MESSAGE_TYPES.modules,
    requestIdPrefix: 'feedbacks-list',
    iframeNamePrefix: 'build-connect-feedbacks-list-iframe',
    timeoutMs: BRIDGE_REQUEST_TIMEOUTS.modules,
    timeoutMessage: 'A listagem dos feedbacks demorou mais que o esperado.',
    bridgeLoadErrorMessage: 'Não foi possível carregar os feedbacks.',
    webAppUrlErrorMessage: 'URL do Web App não configurada.',
  });
}

export function marcarFeedbackLido(registroId) {
  return requestAppsScriptBridge({
    action: 'marcar-feedback-lido',
    fields: { registroId: String(registroId || '') },
    messageType: BRIDGE_MESSAGE_TYPES.modules,
    requestIdPrefix: 'feedback-read',
    iframeNamePrefix: 'build-connect-feedback-read-iframe',
    timeoutMs: BRIDGE_REQUEST_TIMEOUTS.modules,
    timeoutMessage: 'A marcação do feedback demorou mais que o esperado.',
    bridgeLoadErrorMessage: 'Não foi possível marcar o feedback como lido.',
    webAppUrlErrorMessage: 'URL do Web App não configurada.',
  });
}
