import { MODULE_ITEM_TYPES, MODULE_VIEW_MODE, TOOL_FILTER_OPTIONS } from '../../constants/module.constants.js';
import { formatDateLabel } from '../../utils/date.js';
import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';
import { openOverlayModal, closeActiveOverlayModal } from '../shared/overlay-modal.js';
import { prepareModuleItems } from './module-items.js';
import { registrarAtividade } from '../../services/historico.service.js';
import {
  markContentInProgress,
  markContentComplete,
  getInProgressRefIds,
} from '../../services/content-progress.service.js';
import { _contentStatusPill } from './video-module.markup.js';
import { queueCelebration } from '../../utils/celebration.js';
import {
  isVitrineModuleId,
  isImageItem,
  getDriveFileId,
  getDriveThumbnailUrl,
  isItemNew,
  markItemSeen,
  removeNewBadgeFromCard,
} from '../../services/vitrine-new-items.service.js';
import { animateOut } from '../../utils/motion.js';
import {
  SEQUENTIAL_MODULE_IDS,
  isItemSequentiallyLocked,
} from '../../services/navi.service.js';

export function getDocumentModuleMarkup(card, moduleData, moduleUi, renderDependencies) {
  const items = Array.isArray(moduleData?.items) ? moduleData.items : [];
  const {
    getModuleEmptyMarkup,
    getModuleToolbarMarkup,
    getModuleSearchEmptyMarkup,
    getModuleToolFilterMarkup,
  } = renderDependencies;

  const consumedRefIds   = new Set(Array.isArray(moduleData?.consumedRefIds) ? moduleData.consumedRefIds : []);
  const inProgressRefIds = getInProgressRefIds();

  if (!items.length) {
    return getModuleEmptyMarkup(card, moduleData?.emptyMessage || 'Nenhum arquivo foi encontrado para este módulo.');
  }

  const activeFilter  = moduleUi?.selectedToolFilter || '';
  const preparedItems = prepareModuleItems(items, moduleUi, MODULE_ITEM_TYPES.document);
  // Sequential lock: active for all users except Admin (naviSequentialActive=false)
  const isSequential  = SEQUENTIAL_MODULE_IDS.has(card.id) && (moduleUi?.naviSequentialActive !== false);
  // Vitrine: sem filtros de ferramenta
  const isVitrineCtx  = isVitrineModuleId(card.id);

  return `
    <div class="module-shell" data-module-shell>
      <div class="module-shell-header module-shell-header--stacked">
        <div>
          <p class="module-eyebrow">Conteúdo carregado</p>
          <h2 class="module-title">${sanitizeText(card.title)}</h2>
          <p class="module-description">Arquivos listados automaticamente a partir da base de dados.</p>
        </div>
        ${getModuleToolbarMarkup(card.id, moduleUi, items.length, preparedItems.length, 'Busque por nome do arquivo')}
      </div>

      ${isVitrineCtx ? '' : getModuleToolFilterMarkup(TOOL_FILTER_OPTIONS, activeFilter)}

      <div class="module-items-grid module-items-grid-docs ${moduleUi.view === MODULE_VIEW_MODE.list ? 'is-list-view' : 'is-grid-view'}" data-module-items-container>
        ${preparedItems.length
          ? preparedItems.map((item, idx) => {
              const prevItem   = isSequential && idx > 0 ? preparedItems[idx - 1] : null;
              const prevRefId  = prevItem ? `doc-${_resolveDocumentPreviewUrl(prevItem)}`.slice(0, 128) : null;
              const isLocked   = isSequential && isItemSequentiallyLocked(idx, prevRefId, consumedRefIds);
              return _renderDocumentItemCard(item, card.id, consumedRefIds, inProgressRefIds, isLocked);
            }).join('')
          : getModuleSearchEmptyMarkup()}
      </div>
    </div>
  `;
}

export function openDocumentModal(documentItem) {
  if (!documentItem.previewUrl) return;

  const title  = _resolveDocumentTitle(documentItem);
  const tipo   = documentItem.moduloId === 'instrucoes-escritas' ? 'instrucao_escrita' : 'documento';
  const refId  = `doc-${documentItem.previewUrl}`.slice(0, 128);

  // Vitrine image → modal de imagem responsivo
  if (isVitrineModuleId(documentItem.moduloId) && documentItem.isImage) {
    _openVitrineImageModal(documentItem, refId, title, tipo);
    return;
  }

  markContentInProgress(refId);
  _updateDocCardBadge(documentItem.previewUrl, 'in-progress');

  // Guard: previne duplo disparo se o botão for clicado mais de uma vez antes do modal fechar.
  let _finishing = false;

  openOverlayModal({
    title,
    frameUrl: documentItem.previewUrl,
    closeLabel: 'Fechar documento',
    modalClassName: 'video-modal document-modal',
    frameWrapClassName: 'video-modal-frame-wrap document-modal-frame-wrap',
    frameClassName: 'video-modal-frame document-modal-frame',
    onFinishReading: async () => {
      if (_finishing) return;
      _finishing = true;

      // ── Operações síncronas imediatas (UX: não bloqueia o fechamento do modal) ──
      markContentComplete(refId);
      _updateDocCardBadge(documentItem.previewUrl, 'complete');
      if (!isVitrineModuleId(documentItem.moduloId)) {
        queueCelebration({ message: 'Parabéns! Conteúdo concluído.' });
      }
      closeActiveOverlayModal();

      // ── Aguarda o registro no servidor antes de disparar o evento ──────────────
      // FIX: registrarAtividade era chamado sem await, causando race condition:
      // prefetchSectorAlerts (disparado pelo evento) lia buscar-consumo-usuario
      // antes do servidor gravar a atividade → pill do card não atualizava.
      await registrarAtividade({
        tipo,
        titulo: title,
        setorId: documentItem.sectorId || '',
        moduloId: documentItem.moduloId || 'documentos',
        referenciaId: refId,
      }).catch(() => { /* silencioso — a atividade será re-registrada na próxima sessão */ });

      document.dispatchEvent(new CustomEvent('bc:content-completed', {
        detail: { sectorId: documentItem.sectorId, refId },
      }));
    },
  });
}

// ── Modal de imagem responsivo (Vitrine) ────────────────────────────────────

let _activeImageModal = null;

function _openVitrineImageModal(documentItem, refId, title, tipo) {
  if (_activeImageModal) { _closeVitrineImageModal(); }

  markContentInProgress(refId);
  markItemSeen(refId);
  removeNewBadgeFromCard(documentItem.previewUrl);

  const fileId = getDriveFileId(documentItem.previewUrl);
  // sz=s0 solicita a imagem no tamanho original do arquivo, sem redimensionamento
  const imgSrc = fileId
    ? getDriveThumbnailUrl(fileId, 's0')
    : documentItem.previewUrl;

  const backdrop = document.createElement('div');
  backdrop.className = 'bc-image-modal-backdrop';
  backdrop.innerHTML = `
    <div class="bc-image-modal" role="dialog" aria-modal="true" aria-label="${sanitizeAttribute(title)}">
      <div class="bc-image-modal-head">
        <strong class="bc-image-modal-title">${sanitizeText(title)}</strong>
        <button type="button" class="video-modal-close" aria-label="Fechar imagem" data-image-modal-close>
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="bc-image-modal-body">
        <img class="bc-image-modal-img"
          src="${sanitizeAttribute(imgSrc)}"
          alt="${sanitizeAttribute(title)}"
          loading="eager"
          decoding="async"
        />
      </div>
    </div>
  `;

  const closeBtn = backdrop.querySelector('[data-image-modal-close]');
  closeBtn.addEventListener('click', _closeVitrineImageModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) _closeVitrineImageModal();
  });
  document.addEventListener('keydown', _handleImageModalEsc);

  document.body.appendChild(backdrop);
  document.body.classList.add('has-video-modal');
  _activeImageModal = backdrop;

  if (window.lucide) window.lucide.createIcons({ root: backdrop });

  // Registra conclusão ao abrir (imagem = consumo imediato)
  registrarAtividade({
    tipo,
    titulo: title,
    setorId: documentItem.sectorId || '',
    moduloId: documentItem.moduloId || 'documentos',
    referenciaId: refId,
  });
  markContentComplete(refId);
  // Vitrine: sem parabenização pós-consumo
  document.dispatchEvent(new CustomEvent('bc:content-completed', {
    detail: { sectorId: documentItem.sectorId, refId },
  }));
  _updateDocCardBadge(documentItem.previewUrl, 'complete');
}

function _handleImageModalEsc(e) {
  if (e.key === 'Escape') _closeVitrineImageModal();
}

function _closeVitrineImageModal() {
  document.removeEventListener('keydown', _handleImageModalEsc);
  if (!_activeImageModal) return;
  const target = _activeImageModal;
  _activeImageModal = null;
  animateOut(target, 'is-closing', 200, () => {
    target.remove();
    document.body.classList.remove('has-video-modal');
  });
}

// ── Badge helpers ──────────────────────────────────────────────────────────

function _updateDocCardBadge(previewUrl, state) {
  if (!previewUrl) return;
  const btn    = document.querySelector(`[data-document-preview-url="${CSS.escape(previewUrl)}"]`);
  const cardEl = btn?.closest('[data-module-entry]');
  if (!cardEl) return;

  if (state === 'complete') cardEl.classList.add('is-done');

  const badge = cardEl.querySelector('.content-status-pill');
  if (!badge) return;

  const isDone       = state === 'complete';
  const isInProgress = state === 'in-progress';
  if (badge.classList.contains('content-status-pill--complete') && !isDone) return;

  badge.outerHTML = _contentStatusPill(isDone, isInProgress);
  const newBadge = cardEl.querySelector('.content-status-pill');
  if (newBadge && window.lucide) window.lucide.createIcons({ nodes: [newBadge] });
}

// ── Card rendering ─────────────────────────────────────────────────────────

function _renderDocumentItemCard(item, moduloId = 'documentos', consumedRefIds = new Set(), inProgressRefIds = new Set(), isLocked = false) {
  const extension     = sanitizeText(item.extension || 'Arquivo').toUpperCase();
  const modifiedLabel = formatDateLabel(item.modifiedAt);
  const sizeLabel     = sanitizeText(item.sizeLabel || '');
  const metadata      = [extension, modifiedLabel, sizeLabel].filter(Boolean);
  const previewUrl    = _resolveDocumentPreviewUrl(item);
  const canPreview    = Boolean(previewUrl) && !isLocked;

  const refId         = previewUrl ? `doc-${previewUrl}`.slice(0, 128) : null;
  const isVitrine     = isVitrineModuleId(moduloId);
  const isImage       = isVitrine && isImageItem(item);
  const fileId        = isImage ? getDriveFileId(previewUrl) : null;
  const thumbUrl      = fileId ? getDriveThumbnailUrl(fileId, 'w300') : null;

  const isDone        = Boolean(refId && consumedRefIds.has(refId));
  const isInProgress  = Boolean(!isDone && refId && inProgressRefIds.has(refId));
  const showNew       = isVitrine && refId && isItemNew(refId) && !isDone;

  const statusBadge = isVitrine
    ? (showNew ? `<span class="vitrine-new-badge" aria-label="Novo">Novo!</span>` : '')
    : _contentStatusPill(isDone, isInProgress);

  const iconMarkup = isImage && thumbUrl
    ? `<div class="vitrine-img-thumb-wrap"><img class="vitrine-img-thumb" src="${sanitizeAttribute(thumbUrl)}" alt="${sanitizeAttribute(item.name || '')}" loading="lazy" /></div>`
    : `<span class="card-icon module-item-icon" aria-hidden="true"><i data-lucide="${isLocked ? 'lock' : 'file-text'}"></i></span>`;

  const extraAttrs = isImage ? ' data-document-is-image="true"' : '';
  const naviAttrs  = isLocked ? ' data-navi-locked="true"' : '';

  return `
    <article class="module-item-card ${isDone ? 'is-done' : ''} ${isImage ? 'is-image-card' : ''} ${isLocked ? 'is-navi-locked' : ''}" data-module-entry>
      ${statusBadge}
      <div class="module-item-header">
        ${iconMarkup}
        <div class="module-item-copy">
          <h3 class="module-item-title">${sanitizeText(item.name || 'Arquivo sem nome')}</h3>
          <p class="module-item-meta">${isLocked ? 'Bloqueado — conclua o item anterior' : metadata.join(' • ')}</p>
        </div>
      </div>

      <div class="module-item-actions">
        <button
          type="button"
          class="module-link-button ${isLocked ? 'navi-item-locked-btn' : ''}"
          data-document-preview-url="${sanitizeAttribute(previewUrl)}"
          data-document-title="${sanitizeAttribute(item.name || 'Documento')}"
          data-document-modulo-id="${sanitizeAttribute(moduloId || 'documentos')}"
          ${canPreview ? '' : 'disabled'}
          ${extraAttrs}${naviAttrs}
          aria-disabled="${isLocked ? 'true' : 'false'}"
        >
          <i data-lucide="${isLocked ? 'lock' : isImage ? 'expand' : 'external-link'}"></i>
          <span>${isLocked ? 'Bloqueado' : isImage ? 'Ver foto' : 'Abrir'}</span>
        </button>
      </div>
    </article>
  `;
}

function _resolveDocumentTitle(item) {
  const name = String(item?.name || item?.title || item?.fileName || '').trim();
  return name || 'Arquivo sem nome';
}

function _resolveDocumentPreviewUrl(item) {
  const direct = String(item?.previewUrl || '').trim();
  if (direct) return direct;

  const openUrl = String(item?.openUrl || '').trim();
  if (!openUrl) return '';

  const driveMatch = openUrl.match(/https:\/\/drive\.google\.com\/file\/d\/([^/]+)\//i);
  if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;

  const docMatch = openUrl.match(/https:\/\/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([^/]+)/i);
  if (docMatch) return `https://docs.google.com/${docMatch[1]}/d/${docMatch[2]}/preview`;

  return openUrl;
}
