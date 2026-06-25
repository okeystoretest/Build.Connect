import {
  APPS_SCRIPT_WEB_APP_URL,
  BRIDGE_ALLOWED_ORIGINS,
  GOOGLE_USER_CONTENT_ORIGIN_PATTERN,
} from '../config/app.config.js';

export function requestAppsScriptBridge({
  action,
  fields = {},
  messageType,
  includeMessageType = true,
  requestIdPrefix = 'request',
  iframeNamePrefix = 'build-connect-bridge-iframe',
  timeoutMs = 15000,
  timeoutMessage = 'A operação demorou mais que o esperado.',
  bridgeLoadErrorMessage = 'Não foi possível carregar a bridge do Apps Script.',
  webAppUrl = APPS_SCRIPT_WEB_APP_URL,
  webAppUrlErrorMessage = 'URL do Web App do Apps Script não configurada.',
}) {
  if (!webAppUrl) {
    return Promise.reject(new Error(webAppUrlErrorMessage));
  }

  return new Promise((resolve, reject) => {
    const requestId = `${requestIdPrefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const iframe = document.createElement('iframe');
    const form = document.createElement('form');
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    iframe.name = `${iframeNamePrefix}-${requestId}`;
    iframe.hidden = true;
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;
    iframe.style.display = 'none';

    form.method = 'POST';
    form.action = webAppUrl;
    form.target = iframe.name;
    form.style.display = 'none';
    form.noValidate = true;

    appendHiddenField(form, 'action', action);
    appendHiddenField(form, 'bridge', 'iframe-post-message');

    if (includeMessageType && messageType) {
      appendHiddenField(form, 'messageType', messageType);
    }

    appendHiddenField(form, 'requestId', requestId);
    appendHiddenField(form, 'origin', getParentOrigin());

    Object.entries(fields).forEach(([name, value]) => {
      appendHiddenField(form, name, value);
    });

    function handleMessage(event) {
      if (!isAllowedBridgeOrigin(event.origin)) {
        return;
      }

      const message = parseBridgeMessage(event.data);

      if (!message || message.type !== messageType || message.requestId !== requestId) {
        return;
      }

      cleanup();
      resolve(message.payload);
    }

    function handleIframeError() {
      cleanup();
      reject(new Error(bridgeLoadErrorMessage));
    }

    function cleanup() {
      window.clearTimeout(timeoutId);
      window.removeEventListener('message', handleMessage);
      iframe.removeEventListener('error', handleIframeError);
      form.remove();
      iframe.remove();
    }

    window.addEventListener('message', handleMessage);
    iframe.addEventListener('error', handleIframeError);

    document.body.append(iframe, form);
    form.submit();
  });
}

function appendHiddenField(form, name, value) {
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = name;
  input.value = String(value ?? '');
  form.appendChild(input);
}

function getParentOrigin() {
  const origin = window.location.origin;
  // S-007: Nunca enviar '*' como origin — GAS rejeitará requests sem origem válida.
  // Em contextos file:// ou iframes sandboxed, retorna string vazia para que o
  // servidor recuse o postMessage em vez de transmitir dados para qualquer listener.
  if (!origin || origin === 'null') return '';
  return origin;
}

function isAllowedBridgeOrigin(origin) {
  if (!origin) {
    return false;
  }

  return BRIDGE_ALLOWED_ORIGINS.includes(origin) || GOOGLE_USER_CONTENT_ORIGIN_PATTERN.test(origin);
}

function parseBridgeMessage(data) {
  if (!data) {
    return null;
  }

  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  if (typeof data === 'object') {
    return data;
  }

  return null;
}
