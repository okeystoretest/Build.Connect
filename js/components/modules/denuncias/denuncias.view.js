import { sanitizeAttribute, sanitizeText } from '../../../utils/sanitize.js';
import { formatDateLabel } from '../../../utils/date.js';
import { DENUNCIA_STATUS_META, DENUNCIA_STATUS_ORDER } from './denuncias.constants.js';

export function getDenunciasModuleMarkup(card, _moduleData, ui = {}) {
  const dui = ui.denuncias || {};
  return `
    <div class="module-shell denuncias-shell" data-module-shell data-denuncias-root>
      <div class="module-shell-header">
        <div>
          <p class="module-eyebrow">Confidencial · NR-1</p>
          <h2 class="module-title">${sanitizeText(card.title)}</h2>
          <p class="module-description">Relatos anônimos recebidos pelo canal de denúncias. Trate com sigilo.</p>
        </div>
      </div>

      <div class="denuncias-filterbar" role="tablist" aria-label="Filtrar por status">
        ${renderFilterButton('', 'Todas', dui.statusFilter)}
        ${DENUNCIA_STATUS_ORDER.map((s) => renderFilterButton(s, DENUNCIA_STATUS_META[s].label, dui.statusFilter)).join('')}
      </div>

      <div class="denuncias-body" data-denuncias-body>
        ${renderBody(dui)}
      </div>
    </div>
  `;
}

function renderFilterButton(value, label, current) {
  const active = (current || '') === value;
  return `
    <button type="button" class="denuncias-filter-btn ${active ? 'is-active' : ''}"
      data-denuncia-filter="${sanitizeAttribute(value)}" aria-pressed="${active}">
      ${sanitizeText(label)}
    </button>`;
}

function renderBody(dui) {
  if (dui.loadStatus === 'loading' || dui.loadStatus === 'idle') {
    return `<div class="ti-requests-loading"><div class="ti-loading-spinner"><i data-lucide="loader-circle"></i></div><p>Carregando denúncias…</p></div>`;
  }
  if (dui.loadStatus === 'error') {
    return `<div class="module-empty-state"><i data-lucide="triangle-alert"></i><p>${sanitizeText(dui.errorMessage || 'Falha ao carregar as denúncias.')}</p></div>`;
  }

  const list = Array.isArray(dui.denuncias) ? dui.denuncias : [];
  if (!list.length) {
    return `<div class="module-empty-state"><i data-lucide="inbox"></i><p>Nenhuma denúncia ${dui.statusFilter ? 'com este status' : 'registrada'}.</p></div>`;
  }

  return `<div class="denuncias-list">${list.map(renderDenunciaCard).join('')}</div>`;
}

function renderDenunciaCard(d) {
  const meta = DENUNCIA_STATUS_META[d.status] || DENUNCIA_STATUS_META.aberta;
  const envolvido = d.envolvidoNome
    ? `${sanitizeText(d.envolvidoNome)}${d.envolvidoSetor ? ` · ${sanitizeText(d.envolvidoSetor)}` : ''}`
    : '<em>Não informado</em>';
  const preview = String(d.descricao || '').slice(0, 160);
  return `
    <button type="button" class="denuncia-card" data-denuncia-open="${sanitizeAttribute(d.id)}">
      <div class="denuncia-card-top">
        <span class="denuncia-status ${meta.className}"><i data-lucide="${meta.icon}"></i>${sanitizeText(meta.label)}</span>
        <span class="denuncia-date">${sanitizeText(formatDateLabel(d.criadoEm))}</span>
      </div>
      <p class="denuncia-card-envolvido"><i data-lucide="user"></i> Envolvido: ${envolvido}</p>
      <p class="denuncia-card-preview">${sanitizeText(preview)}${d.descricao && d.descricao.length > 160 ? '…' : ''}</p>
      <div class="denuncia-card-foot">
        ${d.anexosCount ? `<span class="denuncia-anexos-badge"><i data-lucide="paperclip"></i>${d.anexosCount}</span>` : ''}
        <span class="denuncia-open-hint">Abrir <i data-lucide="chevron-right"></i></span>
      </div>
    </button>`;
}

// ── Detalhe (modal/painel) ──────────────────────────────────────────────────

export function getDenunciaDetailMarkup(detail) {
  const meta = DENUNCIA_STATUS_META[detail.status] || DENUNCIA_STATUS_META.aberta;
  const envolvido = detail.envolvidoNome
    ? `${sanitizeText(detail.envolvidoNome)}${detail.envolvidoSetor ? ` · ${sanitizeText(detail.envolvidoSetor)}` : ''}${detail.envolvidoId ? ` (${sanitizeText(detail.envolvidoId)})` : ''}`
    : '<em>Não informado</em>';

  const anexos = Array.isArray(detail.anexos) ? detail.anexos : [];
  const anexosMarkup = anexos.length
    ? `<ul class="denuncia-detail-anexos">${anexos.map(renderAnexo).join('')}</ul>`
    : '<p class="denuncia-detail-empty">Nenhum anexo.</p>';

  return `
    <div class="video-modal-backdrop denuncia-detail-backdrop" data-denuncia-detail-backdrop>
      <div class="anon-fb-modal anon-fb-dialog denuncia-detail-dialog" role="dialog" aria-modal="true" aria-label="Detalhe da denúncia">
        <div class="anon-fb-head">
          <div class="anon-fb-head-copy">
            <span class="anon-fb-eyebrow">Denúncia · ${sanitizeText(formatDateLabel(detail.criadoEm))}</span>
            <strong class="anon-fb-title">Detalhe da denúncia</strong>
          </div>
          <button type="button" class="video-modal-close" data-denuncia-detail-close aria-label="Fechar"><i data-lucide="x"></i></button>
        </div>

        <div class="anon-fb-body">
          <div class="denuncia-detail-meta">
            <span class="denuncia-status ${meta.className}"><i data-lucide="${meta.icon}"></i>${sanitizeText(meta.label)}</span>
            <span class="denuncia-detail-envolvido"><i data-lucide="user"></i> ${envolvido}</span>
          </div>

          <div class="denuncia-detail-section">
            <span class="form-label">Descrição dos fatos</span>
            <p class="denuncia-detail-text">${sanitizeText(detail.descricao || '')}</p>
          </div>

          <div class="denuncia-detail-section">
            <span class="form-label">Anexos</span>
            ${anexosMarkup}
          </div>

          <div class="denuncia-detail-section">
            <span class="form-label">Acompanhamento</span>
            <div class="denuncia-status-actions">
              ${DENUNCIA_STATUS_ORDER.map((s) => `
                <button type="button" class="denuncia-status-btn ${detail.status === s ? 'is-current' : ''}"
                  data-denuncia-set-status="${sanitizeAttribute(s)}" data-denuncia-id="${sanitizeAttribute(detail.id)}"
                  ${detail.status === s ? 'disabled' : ''}>
                  <i data-lucide="${DENUNCIA_STATUS_META[s].icon}"></i>${sanitizeText(DENUNCIA_STATUS_META[s].label)}
                </button>`).join('')}
            </div>
            <span class="denuncia-status-feedback" data-denuncia-status-feedback></span>
          </div>
        </div>
      </div>
    </div>`;
}

function renderAnexo(a) {
  const isPdf = /\.pdf$/i.test(a.nome || '');
  return `
    <li class="denuncia-anexo-item">
      <i data-lucide="${isPdf ? 'file-text' : 'image'}"></i>
      <span class="denuncia-anexo-name">${sanitizeText(a.nome || 'anexo')}</span>
      ${a.url
        ? `<a class="denuncia-anexo-link" href="${sanitizeAttribute(a.url)}" target="_blank" rel="noopener noreferrer" download><i data-lucide="download"></i>Abrir</a>`
        : '<span class="denuncia-anexo-fail">indisponível</span>'}
    </li>`;
}
