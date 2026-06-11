import { MODULE_ITEM_TYPES, MODULE_VIEW_MODE, TOOL_FILTER_OPTIONS } from '../../constants/module.constants.js';
import { formatDateLabel } from '../../utils/date.js';
import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';
import { openOverlayModal, closeActiveOverlayModal } from '../shared/overlay-modal.js';
import { prepareModuleItems } from './module-items.js';
import { registrarAtividade } from '../../services/historico.service.js';

export function getDocumentModuleMarkup(card, moduleData, moduleUi, renderDependencies) {
  const items = Array.isArray(moduleData?.items) ? moduleData.items : [];
  const { getModuleEmptyMarkup, getModuleToolbarMarkup, getModuleSearchEmptyMarkup, getModuleToolFilterMarkup } = renderDependencies;
  const consumedRefIds = new Set(Array.isArray(moduleData?.consumedRefIds) ? moduleData.consumedRefIds : []);

  if (!items.length) {
    return getModuleEmptyMarkup(card, moduleData?.emptyMessage || 'Nenhum arquivo foi encontrado para este módulo.');
  }

  const activeFilter = moduleUi?.selectedToolFilter || '';
  const preparedItems = prepareModuleItems(items, moduleUi, MODULE_ITEM_TYPES.document);

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

      ${getModuleToolFilterMarkup(TOOL_FILTER_OPTIONS, activeFilter)}

      <div class="module-items-grid module-items-grid-docs ${moduleUi.view === MODULE_VIEW_MODE.list ? 'is-list-view' : 'is-grid-view'}" data-module-items-container>
        ${preparedItems.length ? preparedItems.map((item) => renderDocumentItemCard(item, card.id, consumedRefIds)).join('') : getModuleSearchEmptyMarkup()}
      </div>
    </div>
  `;
}

export function openDocumentModal(documentItem) {
  if (!documentItem.previewUrl) return;

  const title = resolveDocumentTitle(documentItem);
  const tipo = documentItem.moduloId === 'instrucoes-escritas' ? 'instrucao_escrita' : 'documento';

  openOverlayModal({
    title,
    frameUrl: documentItem.previewUrl,
    closeLabel: 'Fechar documento',
    modalClassName: 'video-modal document-modal',
    frameWrapClassName: 'video-modal-frame-wrap document-modal-frame-wrap',
    frameClassName: 'video-modal-frame document-modal-frame',
    onFinishReading: () => {
      registrarAtividade({
        tipo,
        titulo: title,
        setorId: documentItem.sectorId || '',
        moduloId: documentItem.moduloId || 'documentos',
        referenciaId: `doc-${documentItem.previewUrl}`.slice(0, 128),
      });
      closeActiveOverlayModal();
    },
  });
}

function renderDocumentItemCard(item, moduloId = 'documentos', consumedRefIds = new Set()) {
  const extension = sanitizeText(item.extension || 'Arquivo').toUpperCase();
  const modifiedLabel = formatDateLabel(item.modifiedAt);
  const sizeLabel = sanitizeText(item.sizeLabel || '');
  const metadata = [extension, modifiedLabel, sizeLabel].filter(Boolean);
  const previewUrl = resolveDocumentPreviewUrl(item);
  const canPreview = Boolean(previewUrl);

  const refId = previewUrl ? (`doc-${previewUrl}`).slice(0, 128) : null;
  const isDone = refId && consumedRefIds.has(refId);

  return `
    <article class="module-item-card ${isDone ? 'is-done' : ''}" data-module-entry>
      <span class="module-item-status-badge ${isDone ? 'is-complete' : 'is-pending'}" aria-label="${isDone ? 'Concluído' : 'Atenção'}">
        <i data-lucide="${isDone ? 'check-circle-2' : 'alert-triangle'}"></i>
        <span>${isDone ? 'Concluído' : 'Atenção'}</span>
      </span>
      <div class="module-item-header">
        <span class="card-icon module-item-icon" aria-hidden="true">
          <i data-lucide="file-text"></i>
        </span>
        <div class="module-item-copy">
          <h3 class="module-item-title">${sanitizeText(item.name || 'Arquivo sem nome')}</h3>
          <p class="module-item-meta">${metadata.join(' • ')}</p>
        </div>
      </div>

      <div class="module-item-actions">
        <button
          type="button"
          class="module-link-button"
          data-document-preview-url="${sanitizeAttribute(previewUrl)}"
          data-document-title="${sanitizeAttribute(item.name || 'Documento')}"
          data-document-modulo-id="${sanitizeAttribute(moduloId || 'documentos')}"
          ${canPreview ? '' : 'disabled'}
        >
          <i data-lucide="external-link"></i>
          <span>Abrir</span>
        </button>
      </div>
    </article>
  `;
}

function resolveDocumentTitle(item) {
  const documentName = String(item?.name || item?.title || item?.fileName || '').trim();
  return documentName || 'Arquivo sem nome';
}

function resolveDocumentPreviewUrl(item) {
  const directPreviewUrl = String(item?.previewUrl || '').trim();

  if (directPreviewUrl) {
    return directPreviewUrl;
  }

  const openUrl = String(item?.openUrl || '').trim();

  if (!openUrl) {
    return '';
  }

  const driveFileMatch = openUrl.match(/https:\/\/drive\.google\.com\/file\/d\/([^/]+)\//i);
  if (driveFileMatch) {
    return `https://drive.google.com/file/d/${driveFileMatch[1]}/preview`;
  }

  const docMatch = openUrl.match(/https:\/\/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([^/]+)/i);
  if (docMatch) {
    return `https://docs.google.com/${docMatch[1]}/d/${docMatch[2]}/preview`;
  }

  return openUrl;
}
