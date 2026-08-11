import { listarDenuncias, buscarDenuncia, atualizarStatusDenuncia } from '../../../services/denuncias-admin.service.js';
import { refreshLucideIcons } from '../../../services/icons.service.js';
import { getDenunciaDetailMarkup } from './denuncias.view.js';
import { DENUNCIAS_UI_DEFAULTS } from './denuncias.constants.js';

/**
 * Handlers da Central de Denúncias (DHO). Segue o padrão dos módulos
 * self-loading: recebe o contexto de estado/render e manipula ui.denuncias.
 *
 * context = { getModuleState, setModuleState, renderModuleStage }
 */
export function createDenunciasModuleHandlers(context) {
  const { getModuleState, setModuleState, renderModuleStage } = context;

  function patchUi(sectorId, patch) {
    const state = getModuleState(sectorId);
    const ui = state.ui || {};
    const denuncias = { ...DENUNCIAS_UI_DEFAULTS, ...(ui.denuncias || {}), ...patch };
    setModuleState(sectorId, { ...state, ui: { ...ui, denuncias } });
  }

  async function loadDenuncias(rootElement, sector) {
    const state = getModuleState(sector.id);
    const statusFilter = state.ui?.denuncias?.statusFilter || '';
    patchUi(sector.id, { loadStatus: 'loading', errorMessage: '' });
    renderModuleStage(rootElement, sector);

    const res = await listarDenuncias({ status: statusFilter });
    if (!res.success) {
      patchUi(sector.id, { loadStatus: 'error', errorMessage: res.message || 'Falha ao carregar denúncias.' });
      renderModuleStage(rootElement, sector);
      return;
    }
    patchUi(sector.id, { loadStatus: 'success', denuncias: res.denuncias });
    renderModuleStage(rootElement, sector);
  }

  function setStatusFilter(rootElement, sector, statusFilter) {
    patchUi(sector.id, { statusFilter });
    loadDenuncias(rootElement, sector);
  }

  async function openDetail(rootElement, sector, denunciaId) {
    if (!denunciaId) return;
    // Overlay de carregamento
    mountDetailOverlay(getDetailLoadingMarkup());

    const res = await buscarDenuncia(denunciaId);
    if (!res.success || !res.denuncia) {
      mountDetailOverlay(getDetailErrorMarkup(res.message || 'Não foi possível abrir a denúncia.'));
      return;
    }
    mountDetailOverlay(getDenunciaDetailMarkup(res.denuncia));
    bindDetailEvents(rootElement, sector);
  }

  async function setStatus(rootElement, sector, denunciaId, status) {
    const feedback = document.querySelector('[data-denuncia-status-feedback]');
    if (feedback) { feedback.textContent = 'Atualizando…'; feedback.className = 'denuncia-status-feedback is-loading'; }

    const res = await atualizarStatusDenuncia(denunciaId, status);
    if (!res.success) {
      if (feedback) { feedback.textContent = res.message || 'Falha ao atualizar.'; feedback.className = 'denuncia-status-feedback is-error'; }
      return;
    }
    // Re-abre o detalhe atualizado e recarrega a lista de fundo.
    const detail = await buscarDenuncia(denunciaId);
    if (detail.success && detail.denuncia) {
      mountDetailOverlay(getDenunciaDetailMarkup(detail.denuncia));
      bindDetailEvents(rootElement, sector);
    }
    loadDenuncias(rootElement, sector);
  }

  function closeDetail() {
    const existing = document.querySelector('[data-denuncia-detail-backdrop]');
    if (existing) existing.remove();
    document.body.classList.remove('has-video-modal');
  }

  function bindDetailEvents(rootElement, sector) {
    const backdrop = document.querySelector('[data-denuncia-detail-backdrop]');
    if (!backdrop) return;
    refreshLucideIcons(backdrop);

    backdrop.querySelectorAll('[data-denuncia-detail-close]').forEach((b) => b.addEventListener('click', closeDetail));
    backdrop.addEventListener('click', (e) => {
      if (!backdrop.querySelector('[role="dialog"]')?.contains(e.target)) closeDetail();
    });
    backdrop.querySelectorAll('[data-denuncia-set-status]').forEach((btn) => {
      btn.addEventListener('click', () => setStatus(rootElement, sector, btn.dataset.denunciaId, btn.dataset.denunciaSetStatus));
    });
  }

  function mountDetailOverlay(markup) {
    closeDetail();
    const wrap = document.createElement('div');
    wrap.innerHTML = markup;
    const node = wrap.firstElementChild;
    if (!node) return;
    document.body.appendChild(node);
    document.body.classList.add('has-video-modal');
    refreshLucideIcons(node);
    // Fechar por Esc
    const esc = (e) => { if (e.key === 'Escape') { closeDetail(); document.removeEventListener('keydown', esc); } };
    document.addEventListener('keydown', esc);
  }

  return {
    loadDenuncias,
    setStatusFilter,
    openDetail,
    setStatus,
    closeDetail,
  };
}

function getDetailLoadingMarkup() {
  return `
    <div class="video-modal-backdrop denuncia-detail-backdrop" data-denuncia-detail-backdrop>
      <div class="anon-fb-modal anon-fb-dialog denuncia-detail-dialog" role="dialog" aria-modal="true" aria-label="Detalhe da denúncia">
        <div class="anon-fb-body">
          <div class="ti-requests-loading"><div class="ti-loading-spinner"><i data-lucide="loader-circle"></i></div><p>Abrindo denúncia…</p></div>
        </div>
      </div>
    </div>`;
}

function getDetailErrorMarkup(message) {
  return `
    <div class="video-modal-backdrop denuncia-detail-backdrop" data-denuncia-detail-backdrop>
      <div class="anon-fb-modal anon-fb-dialog denuncia-detail-dialog" role="dialog" aria-modal="true" aria-label="Erro">
        <div class="anon-fb-head">
          <div class="anon-fb-head-copy"><strong class="anon-fb-title">Erro</strong></div>
          <button type="button" class="video-modal-close" data-denuncia-detail-close aria-label="Fechar"><i data-lucide="x"></i></button>
        </div>
        <div class="anon-fb-body"><div class="module-empty-state"><i data-lucide="triangle-alert"></i><p>${message}</p></div></div>
      </div>
    </div>`;
}
