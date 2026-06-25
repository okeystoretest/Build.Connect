/**
 * ti-requests.handlers.motorista.js
 * F2 (KM tracking) + F3 (photo upload) + Conclusion handlers — motorista-specific.
 * Receives a shared context from ti-requests.handlers.js via createMotoristaHandlers().
 */

import { SECTOR_IDS } from '../../../constants/sector.constants.js';
import { atualizarStatusChamadoTI, uploadFotoMotorista } from '../../../services/ti-requests.service.js';
import { showToast } from '../../../utils/toast.js';

export function createMotoristaHandlers({ getState, setState, render, ui, isTiModule, loadTiTickets }) {

  // ── F2: KM tracking ──────────────────────────────────────────────────────

  function startKmEntry(rootElement, sector, ticketId) {
    const state = getState(sector.id);
    if (!isTiModule(state)) return;
    setState(sector.id, { ...state, ui: { ...ui(state), startingKmTicketId: ticketId, expandedTicketId: ticketId } });
    render(rootElement, sector);
  }

  function cancelKmEntry(rootElement, sector) {
    const state = getState(sector.id);
    if (!isTiModule(state)) return;
    setState(sector.id, { ...state, ui: { ...ui(state), startingKmTicketId: null } });
    render(rootElement, sector);
  }

  async function confirmKmStart(rootElement, sector, ticketId, user) {
    const kmInput = rootElement.querySelector(`[data-ti-km-input="${CSS.escape(ticketId)}"]`);
    const kmVal   = parseInt(kmInput?.value || '', 10);
    if (isNaN(kmVal) || kmVal < 0) {
      const err = rootElement.querySelector('[data-ti-km-error]');
      if (err) err.style.display = '';
      return;
    }
    const state = getState(sector.id);
    if (!isTiModule(state)) return;
    setState(sector.id, { ...state, ui: { ...ui(state), startingKmTicketId: null, isUpdating: true, updatingTicketId: ticketId } });
    render(rootElement, sector);
    try {
      const resp = await atualizarStatusChamadoTI(
        ticketId, 'Em andamento', String(user?.id || ''), String(user?.nome || ''), '',
        { kmInicial: kmVal },
      );
      const next = getState(sector.id);
      if (!isTiModule(next)) return;
      if (resp?.success) {
        setState(sector.id, { ...next, ui: { ...ui(next), isUpdating: false, updatingTicketId: null, expandedTicketId: null } });
        render(rootElement, sector);
        await loadTiTickets(rootElement, sector);
      } else {
        const errMsg = resp?.message || 'Erro ao iniciar. Tente novamente.';
        setState(sector.id, { ...next, ui: { ...ui(next), isUpdating: false, updatingTicketId: null } });
        render(rootElement, sector);
        showToast(errMsg, { type: 'error', duration: 5000 });
      }
    } catch (err) {
      const next = getState(sector.id);
      const errMsg = err?.message || 'Erro ao iniciar. Tente novamente.';
      setState(sector.id, { ...next, ui: { ...ui(next), isUpdating: false, updatingTicketId: null } });
      render(rootElement, sector);
      showToast(errMsg, { type: 'error', duration: 5000 });
    }
  }

  // ── F3: Photo upload ──────────────────────────────────────────────────────

  // Limites espelhados no backend (handleUploadFotoMotorista)
  const _FOTO_ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
  const _FOTO_MAX_MB  = 5;
  const _FOTO_MAX_QTY = 5;

  function triggerFotoUpload(rootElement, ticketId) {
    const input = rootElement.querySelector(`[data-ti-foto-input="${CSS.escape(ticketId)}"]`);
    if (!input) return;
    input.onchange = () => handleFotoSelection(rootElement, ticketId);
    input.click();
  }

  function handleFotoSelection(rootElement, ticketId) {
    const input   = rootElement.querySelector(`[data-ti-foto-input="${CSS.escape(ticketId)}"]`);
    const preview = rootElement.querySelector(`[data-ti-foto-preview="${CSS.escape(ticketId)}"]`);
    if (!input || !preview) return;

    const all     = Array.from(input.files || []);
    const valid   = [];
    const rejected = [];
    for (const file of all) {
      if (!_FOTO_ALLOWED.includes(file.type)) { rejected.push(`"${file.name}" (tipo inválido)`); continue; }
      if (file.size > _FOTO_MAX_MB * 1024 * 1024) { rejected.push(`"${file.name}" (>${_FOTO_MAX_MB}MB)`); continue; }
      if (valid.length < _FOTO_MAX_QTY) valid.push(file);
    }
    if (valid.length < all.length) {
      const msg = rejected.length
        ? `Ignorados: ${rejected.join(', ')}. Aceitos: JPEG, PNG, WebP até ${_FOTO_MAX_MB}MB.`
        : `Máximo de ${_FOTO_MAX_QTY} fotos por chamado.`;
      showToast(msg, { type: 'warning', duration: 6000 });
    }
    // Repopula input só com arquivos válidos (DataTransfer; fallback silencioso se não suportado)
    try { const dt = new DataTransfer(); valid.forEach(f => dt.items.add(f)); input.files = dt.files; } catch { /* sem suporte — backend rejeita inválidos */ }

    preview.innerHTML = '';
    valid.forEach((file, i) => {
      const img = Object.assign(document.createElement('img'), {
        src: URL.createObjectURL(file), alt: `Foto ${i + 1}`, className: 'ti-foto-thumb',
      });
      preview.appendChild(img);
    });
  }

  function _fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload  = () => resolve(String(r.result || '').split(',')[1] || '');
      r.onerror = () => reject(new Error('Erro ao ler arquivo.'));
      r.readAsDataURL(file);
    });
  }

  // Lê e valida os arquivos do input ANTES de qualquer render (que recria o input
  // e zera input.files). Retorna um array já filtrado, pronto para envio.
  function _collectPendingPhotos(rootElement, ticketId) {
    const input = rootElement.querySelector(`[data-ti-foto-input="${CSS.escape(ticketId)}"]`);
    if (!input?.files?.length) return [];
    return Array.from(input.files)
      .filter(f => _FOTO_ALLOWED.includes(f.type) && f.size <= _FOTO_MAX_MB * 1024 * 1024)
      .slice(0, _FOTO_MAX_QTY);
  }

  async function _uploadPendingPhotos(rootElement, ticketId, files) {
    const status = rootElement.querySelector('[data-ti-foto-status]');
    if (!files?.length) return;
    let uploadErrors = 0;
    let lastErrorMsg = '';
    for (let i = 0; i < files.length; i++) {
      if (status) { status.style.display = ''; status.textContent = `Enviando foto ${i + 1} de ${files.length}…`; }
      try {
        const resp = await uploadFotoMotorista(ticketId, await _fileToBase64(files[i]), files[i].type, files[i].name);
        if (!resp?.success) { uploadErrors++; lastErrorMsg = resp?.message || lastErrorMsg; }
      } catch (err) { uploadErrors++; lastErrorMsg = err?.message || lastErrorMsg; }
    }
    if (status) status.style.display = 'none';
    // Chamado é concluído independente; erro de foto é informado sem bloquear o fluxo
    if (uploadErrors > 0) {
      const detail = lastErrorMsg ? ` (${lastErrorMsg})` : '';
      showToast(`${uploadErrors} foto(s) não foram enviadas ao Drive${detail}.`, { type: 'warning', duration: 9000 });
    }
  }

  // ── Conclusion flow ────────────────────────────────────────────────────────

  function startConclusion(rootElement, sector, ticketId) {
    const state = getState(sector.id);
    if (!isTiModule(state)) return;
    setState(sector.id, { ...state, ui: { ...ui(state), confirmingConclusionId: ticketId, expandedTicketId: ticketId } });
    render(rootElement, sector);
  }

  function cancelConclusion(rootElement, sector) {
    const state = getState(sector.id);
    if (!isTiModule(state)) return;
    setState(sector.id, { ...state, ui: { ...ui(state), confirmingConclusionId: null } });
    render(rootElement, sector);
  }

  // F2+F3: lê obs, kmFinal e fotos diretamente do DOM
  async function confirmConclusion(rootElement, sector, ticketId, user) {
    const isMotorista = sector?.id === SECTOR_IDS.motorista;

    const obsInput = rootElement.querySelector(`[data-ti-obs-input="${CSS.escape(ticketId)}"]`);
    const obs      = String(obsInput?.value || '').trim();
    if (!obs) {
      const err = rootElement.querySelector('[data-ti-obs-error]');
      if (err) err.style.display = '';
      return;
    }

    let kmFinal = undefined;
    if (isMotorista) {
      const kmInput = rootElement.querySelector(`[data-ti-km-final-input="${CSS.escape(ticketId)}"]`);
      const kmVal   = parseInt(kmInput?.value || '', 10);
      if (isNaN(kmVal) || kmVal < 0) {
        const err = rootElement.querySelector('[data-ti-km-final-error]');
        if (err) err.style.display = '';
        return;
      }
      const ticket = [...(ui(getState(sector.id)).tickets || [])].find(t => t.id === ticketId);
      if (ticket?.kmInicial !== null && ticket?.kmInicial !== undefined && kmVal < ticket.kmInicial) {
        const err = rootElement.querySelector('[data-ti-km-final-error]');
        if (err) { err.textContent = `KM final deve ser ≥ ao KM inicial (${ticket.kmInicial}).`; err.style.display = ''; }
        return;
      }
      kmFinal = kmVal;
    }

    const state = getState(sector.id);
    if (!isTiModule(state)) return;

    // Captura as fotos ANTES do render — render() recria o painel de conclusão
    // (e o <input type="file">), zerando input.files. Sem isto, o upload encontra
    // o input vazio e retorna sem enviar nada e sem erro.
    const pendingPhotos = isMotorista ? _collectPendingPhotos(rootElement, ticketId) : [];

    setState(sector.id, { ...state, ui: { ...ui(state), isUpdating: true, updatingTicketId: ticketId } });
    render(rootElement, sector);

    if (isMotorista) await _uploadPendingPhotos(rootElement, ticketId, pendingPhotos);

    try {
      const response = await atualizarStatusChamadoTI(
        ticketId, 'Concluído', String(user?.id || ''), String(user?.nome || ''), obs,
        isMotorista ? { kmFinal } : {},
      );
      const next = getState(sector.id);
      if (!isTiModule(next)) return;
      if (response?.success) {
        setState(sector.id, { ...next, ui: { ...ui(next), isUpdating: false, updatingTicketId: null, confirmingConclusionId: null } });
        render(rootElement, sector);
        await loadTiTickets(rootElement, sector);
      } else {
        const errMsg = response?.message || 'Erro ao concluir. Tente novamente.';
        setState(sector.id, { ...next, ui: { ...ui(next), isUpdating: false, updatingTicketId: null } });
        render(rootElement, sector);
        showToast(errMsg, { type: 'error', duration: 5000 });
      }
    } catch (err) {
      const next = getState(sector.id);
      const errMsg = err?.message || 'Erro ao concluir. Tente novamente.';
      setState(sector.id, { ...next, ui: { ...ui(next), isUpdating: false, updatingTicketId: null } });
      render(rootElement, sector);
      showToast(errMsg, { type: 'error', duration: 5000 });
    }
  }

  return {
    startKmEntry, cancelKmEntry, confirmKmStart,
    triggerFotoUpload, handleFotoSelection,
    startConclusion, cancelConclusion, confirmConclusion,
  };
}
