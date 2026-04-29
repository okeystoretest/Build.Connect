const ADMIN_USERS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyNBAJy1nrKG1_alpIfa4NBj_VGsF5BgJ9RK4dBHRgTuFoojcZjslQvTKPFWN6WQS5I/exec';
const ADMIN_USERS_BRIDGE_MESSAGE_TYPE = 'BUILD_CONNECT_USERS_RESULT';
const ADMIN_USERS_REQUEST_TIMEOUT_MS = 30000;

export function searchManagedUsers(query) {
  return requestAdminUsersViaBridge('search-users', { query });
}

export function createManagedUser(payload) {
  return requestAdminUsersViaBridge('create-user', normalizeUserPayload(payload));
}

export function updateManagedUser(payload) {
  return requestAdminUsersViaBridge('update-user', normalizeUserPayload(payload));
}

export function resetManagedUserPassword(id) {
  return requestAdminUsersViaBridge('reset-user-password', { id });
}

export function diagnoseManagedUsersStorage() {
  return requestAdminUsersViaBridge('users-diagnostics');
}

function normalizeUserPayload(payload = {}) {
  return {
    originalId: String(payload.originalId || '').trim(),
    id: String(payload.id || '').trim(),
    nome: String(payload.nome || '').trim(),
    setores: JSON.stringify(Array.isArray(payload.setores) ? payload.setores : []),
  };
}

function requestAdminUsersViaBridge(action, payload = {}) {
  if (!ADMIN_USERS_WEB_APP_URL) {
    return Promise.reject(new Error('URL do Web App não configurada para gerenciar usuários.'));
  }

  return new Promise((resolve, reject) => {
    const requestId = `admin-users-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const iframe = document.createElement('iframe');
    const form = document.createElement('form');
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('A operação de usuários demorou mais que o esperado.'));
    }, ADMIN_USERS_REQUEST_TIMEOUT_MS);

    iframe.name = `build-connect-admin-users-iframe-${requestId}`;
    iframe.hidden = true;
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;
    iframe.style.display = 'none';

    form.method = 'POST';
    form.action = ADMIN_USERS_WEB_APP_URL;
    form.target = iframe.name;
    form.style.display = 'none';
    form.noValidate = true;

    appendHiddenField(form, 'action', action);
    appendHiddenField(form, 'bridge', 'iframe-post-message');
    appendHiddenField(form, 'messageType', ADMIN_USERS_BRIDGE_MESSAGE_TYPE);
    appendHiddenField(form, 'requestId', requestId);
    appendHiddenField(form, 'origin', getParentOrigin());

    Object.entries(payload).forEach(([name, value]) => {
      appendHiddenField(form, name, value);
    });

    function handleMessage(event) {
      if (!isAllowedBridgeOrigin(event.origin)) {
        return;
      }

      const message = parseBridgeMessage(event.data);

      if (!message || message.type !== ADMIN_USERS_BRIDGE_MESSAGE_TYPE || message.requestId !== requestId) {
        return;
      }

      cleanup();
      resolve(normalizeAdminUsersResponse(message.payload));
    }

    function handleIframeError() {
      cleanup();
      reject(new Error('Não foi possível carregar a bridge de gerenciamento de usuários.'));
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

function normalizeAdminUsersResponse(response) {
  const target = normalizeStorageTarget(response?.target);
  const message = appendStorageTargetToMessage(
    response?.message || (response?.success ? 'Operação concluída com sucesso.' : 'Não foi possível concluir a operação de usuários.'),
    target,
    response?.success,
  );

  if (response?.success) {
    return {
      success: true,
      code: response.code || 'ADMIN_USERS_OK',
      message,
      users: Array.isArray(response.users) ? response.users : [],
      user: response.user || null,
      generatedPassword: String(response.generatedPassword || ''),
      target,
    };
  }

  return {
    success: false,
    code: response?.code || 'ADMIN_USERS_ERROR',
    message,
    users: [],
    user: null,
    generatedPassword: '',
    target,
  };
}

function normalizeStorageTarget(target) {
  if (!target || typeof target !== 'object') {
    return null;
  }

  return {
    spreadsheetId: String(target.spreadsheetId || ''),
    spreadsheetName: String(target.spreadsheetName || ''),
    spreadsheetUrl: String(target.spreadsheetUrl || ''),
    sheetName: String(target.sheetName || ''),
    rowNumber: Number(target.rowNumber || 0),
    logicalLastRow: Number(target.logicalLastRow || 0),
    physicalLastRow: Number(target.physicalLastRow || 0),
  };
}

function appendStorageTargetToMessage(message, target, success) {
  const baseMessage = String(message || '').trim();

  if (!success || !target?.sheetName || !target?.rowNumber) {
    return baseMessage;
  }

  return `${baseMessage} Aba ${target.sheetName}, linha ${target.rowNumber}.`;
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
  return !origin || origin === 'null' ? '*' : origin;
}

function isAllowedBridgeOrigin(origin) {
  if (!origin) {
    return false;
  }

  return origin === 'https://script.google.com' || /https:\/\/[\w.-]*googleusercontent\.com$/.test(origin);
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
