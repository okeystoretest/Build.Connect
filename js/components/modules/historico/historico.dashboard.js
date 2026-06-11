/**
 * historico.dashboard.js
 * Renders the Dashboard de Acompanhamento tab for Histórico.
 * Extracted from historico-module.js to keep module under 400 lines.
 */

import { sanitizeAttribute, sanitizeText } from '../../../utils/sanitize.js';
import { renderPendingContentCard, renderKanbanBoard } from './historico.dashboard-addons.js';

// ── Entry point ──────────────────────────────────────────────────────────────

export function renderDashboard(ui) {
  const historico = ui.historico || [];

  const hasSetor = !!(ui.selectedUserSetor || ui.selectedSectorId);
  if (!historico.length && !ui.loadingContent && !ui.contentData && !hasSetor) {
    return `
      <div class="historico-empty">
        <i data-lucide="inbox"></i>
        <p>Nenhuma atividade registrada para <strong>${sanitizeText(ui.selectedUserNome || ui.selectedUserId)}</strong>.</p>
      </div>
    `;
  }

  if (ui.loadingContent) {
    return `
      <div class="historico-loading">
        <i data-lucide="loader-circle"></i>
        <p>Carregando conteúdo disponível do setor ${sanitizeText(ui.selectedUserSetor || '')}…</p>
      </div>
    `;
  }

  if (ui.contentError) {
    return `
      <div class="historico-empty">
        <i data-lucide="wifi-off"></i>
        <p>Não foi possível carregar o conteúdo do setor. Verifique a conexão e tente novamente.</p>
        <button type="button" class="module-action-button is-secondary" data-historico-retry-content style="margin-top:8px">
          <i data-lucide="refresh-cw"></i>
          <span>Tentar novamente</span>
        </button>
      </div>
    `;
  }

  const content = ui.contentData;
  const refIds  = new Set(historico.map(h => h.referenciaId).filter(Boolean));

  const videosDisp  = content?.videos || [];
  const videosConsum = videosDisp.filter(v => {
    const vid = _extractVideoId(v.embedUrl || '');
    return vid && refIds.has(`video-${vid}`);
  });

  const docsDisp  = content?.docs || [];
  const docsConsum = docsDisp.filter(d =>
    d.previewUrl && refIds.has((`doc-${d.previewUrl}`).slice(0, 128))
  );

  const instrDisp  = content?.instrucoes || [];
  const instrConsum = instrDisp.filter(i =>
    i.previewUrl && refIds.has((`doc-${i.previewUrl}`).slice(0, 128))
  );

  const quizzesAvail    = Array.isArray(content?.quizzesAvail)   ? content.quizzesAvail   : [];
  const quizzesAnswered = Array.isArray(content?.quizzesAnswered) ? content.quizzesAnswered : [];
  const quizzesCorr     = quizzesAnswered.filter(r => r.is_correta);

  const totalDisp   = videosDisp.length + docsDisp.length + instrDisp.length + quizzesAvail.length;
  const totalConsum = videosConsum.length + docsConsum.length + instrConsum.length + quizzesAnswered.length;
  const pctGeral    = totalDisp > 0 ? Math.round((totalConsum / totalDisp) * 100) : 0;

  const categorias = [
    { label: 'Vídeos',              icon: 'play-circle', color: '#D4A257', disponivel: videosDisp.length,  consumido: videosConsum.length,  itensDisp: videosDisp,  refPrefix: 'video' },
    { label: 'Documentos',          icon: 'file-text',   color: '#3B82F6', disponivel: docsDisp.length,    consumido: docsConsum.length,    itensDisp: docsDisp,    refPrefix: 'doc'   },
    { label: 'Instruções Escritas', icon: 'book-open',   color: '#6366F1', disponivel: instrDisp.length,   consumido: instrConsum.length,   itensDisp: instrDisp,   refPrefix: 'doc'   },
    {
      label: 'Questionários', icon: 'help-circle', color: '#10B981',
      disponivel: quizzesAvail.length, consumido: quizzesAnswered.length,
      itensDisp: [], refPrefix: '',
      extra: quizzesAvail.length > 0 ? `${quizzesCorr.length}/${quizzesAnswered.length} corretas` : null,
    },
  ].filter(c => c.disponivel > 0);

  if (!content && !historico.length) {
    return `
      <div class="historico-empty"><i data-lucide="inbox"></i><p>Sem dados disponíveis.</p></div>
    `;
  }

  return `
    <div class="hd-dashboard">
      <div class="hd-user-label">
        <i data-lucide="user-circle"></i>
        <span>${sanitizeText(ui.selectedUserNome || ui.selectedUserId)}</span>
        ${ui.selectedUserSetor ? `<span class="hd-setor-badge">${sanitizeText(ui.selectedUserSetor)}</span>` : ''}
      </div>

      ${!content ? renderHistoricoOnlyDashboard(historico) : `
      <div class="hd-main-row">
        <div class="hd-ring-card">
          <div class="hd-card-head"><i data-lucide="target"></i><span>Progresso Geral</span></div>
          ${_renderProgressAttentionIcon(pctGeral)}
          <div class="hd-ring-center">${renderProgressRing(pctGeral)}</div>
          <p class="hd-ring-sub">${totalConsum} de ${totalDisp} conteúdos</p>
        </div>
        <div class="hd-kpi-col">
          ${categorias.map(c => {
            const pct = c.disponivel > 0 ? Math.round((c.consumido / c.disponivel) * 100) : 0;
            return `
              <div class="hd-kpi-row">
                <div class="hd-kpi-row-icon" style="color:${c.color};background:${c.color}18">
                  <i data-lucide="${sanitizeAttribute(c.icon)}"></i>
                </div>
                <div class="hd-kpi-row-info">
                  <span class="hd-kpi-row-label">${sanitizeText(c.label)}</span>
                  <div class="hd-kpi-row-bar-wrap">
                    <div class="hd-kpi-row-track">
                      <div class="hd-kpi-row-fill ${_progressColorClass(pct)}" style="width:${pct}%"></div>
                    </div>
                    <span class="hd-kpi-row-counts">${c.consumido}/${c.disponivel}</span>
                  </div>
                  ${c.extra ? `<span class="hd-kpi-row-extra">${sanitizeText(c.extra)}</span>` : ''}
                </div>
                <span class="hd-kpi-row-pct" style="color:${c.color}">${pct}%</span>
              </div>`;
          }).join('')}
        </div>
      </div>

      <div class="hd-indicators-grid">
        <div class="hd-indicator">
          <div class="hd-indicator-icon" style="color:#D4A257;background:rgba(212,162,87,0.12)"><i data-lucide="play-circle"></i></div>
          <span class="hd-indicator-value">${videosConsum.length}</span>
          <span class="hd-indicator-label">Vídeos assistidos</span>
          <span class="hd-indicator-total">de ${videosDisp.length} disponíveis</span>
        </div>
        <div class="hd-indicator">
          <div class="hd-indicator-icon" style="color:#3B82F6;background:rgba(59,130,246,0.12)"><i data-lucide="file-text"></i></div>
          <span class="hd-indicator-value">${docsConsum.length}</span>
          <span class="hd-indicator-label">Documentos lidos</span>
          <span class="hd-indicator-total">de ${docsDisp.length} disponíveis</span>
        </div>
        <div class="hd-indicator">
          <div class="hd-indicator-icon" style="color:#6366F1;background:rgba(99,102,241,0.12)"><i data-lucide="book-open"></i></div>
          <span class="hd-indicator-value">${instrConsum.length}</span>
          <span class="hd-indicator-label">Instruções lidas</span>
          <span class="hd-indicator-total">de ${instrDisp.length} disponíveis</span>
        </div>
        <div class="hd-indicator">
          <div class="hd-indicator-icon" style="color:#10B981;background:rgba(16,185,129,0.12)"><i data-lucide="clipboard-check"></i></div>
          <span class="hd-indicator-value">${historico.filter(h => h.tipo === 'avaliacao').length}</span>
          <span class="hd-indicator-label">Avaliações recebidas</span>
          <span class="hd-indicator-total">registradas no histórico</span>
        </div>
        <div class="hd-indicator">
          <div class="hd-indicator-icon" style="color:#8B5CF6;background:rgba(139,92,246,0.12)"><i data-lucide="message-square"></i></div>
          <span class="hd-indicator-value">${historico.filter(h => h.tipo === 'feedback').length}</span>
          <span class="hd-indicator-label">Feedbacks recebidos</span>
          <span class="hd-indicator-total">registrados no histórico</span>
        </div>
        <div class="hd-indicator ${totalDisp > 0 && totalConsum >= totalDisp ? 'is-complete' : ''}">
          <div class="hd-indicator-icon" style="color:${totalDisp > 0 && totalConsum >= totalDisp ? '#10B981' : '#F59E0B'};background:${totalDisp > 0 && totalConsum >= totalDisp ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)'}">
            <i data-lucide="${totalDisp > 0 && totalConsum >= totalDisp ? 'award' : 'clock'}"></i>
          </div>
          <span class="hd-indicator-value">${Math.max(0, totalDisp - totalConsum)}</span>
          <span class="hd-indicator-label">Pendentes</span>
          <span class="hd-indicator-total">${totalDisp > 0 && totalConsum >= totalDisp ? 'Tudo concluído! 🎉' : 'ainda não consumidos'}</span>
        </div>
      </div>

      ${renderPendingContentCard(content, refIds)}

      ${renderKanbanBoard(
        ui.selectedUserNome || ui.selectedUserId,
        ui.selectedUserSetor || '',
        pctGeral,
        totalConsum,
        totalDisp
      )}
      `}
    </div>
  `;
}

// ── Private helpers ───────────────────────────────────────────────────────────

function renderHistoricoOnlyDashboard(historico) {
  const videos     = historico.filter(h => h.tipo === 'video').length;
  const docs       = historico.filter(h => h.tipo === 'documento').length;
  const instrucoes = historico.filter(h => h.tipo === 'instrucao_escrita').length;
  const avaliacoes = historico.filter(h => h.tipo === 'avaliacao').length;

  return `
    <div class="hd-kpi-grid">
      <div class="hd-kpi hd-kpi-video"><i data-lucide="play-circle"></i>
        <div><span class="hd-kpi-value">${videos}</span><span class="hd-kpi-label">Vídeos assistidos</span></div></div>
      <div class="hd-kpi hd-kpi-doc"><i data-lucide="files"></i>
        <div><span class="hd-kpi-value">${docs + instrucoes}</span><span class="hd-kpi-label">Documentos lidos</span></div></div>
      <div class="hd-kpi hd-kpi-aval"><i data-lucide="clipboard-check"></i>
        <div><span class="hd-kpi-value">${avaliacoes}</span><span class="hd-kpi-label">Avaliações</span></div></div>
    </div>
    <p class="hd-empty-small">Conteúdo do setor não disponível para comparação. Verifique se o setor do colaborador está configurado.</p>
  `;
}

function renderProgressRing(pct) {
  const r     = 44;
  const circ  = 2 * Math.PI * r;
  const dash  = (pct / 100) * circ;
  const gap   = circ - dash;
  const color = pct >= 80 ? '#10B981' : pct >= 50 ? '#D4A257' : '#3B82F6';

  return `
    <svg width="110" height="110" viewBox="0 0 110 110" class="hd-ring-svg">
      <circle cx="55" cy="55" r="${r}" fill="none" stroke="var(--border)" stroke-width="10"/>
      <circle cx="55" cy="55" r="${r}" fill="none"
        stroke="${color}" stroke-width="10"
        stroke-dasharray="${dash} ${gap}"
        stroke-linecap="round"
        transform="rotate(-90 55 55)"
        style="transition:stroke-dasharray 600ms var(--ease-premium)"
      />
      <text x="55" y="60" text-anchor="middle" dominant-baseline="middle"
        fill="var(--text)" font-size="20" font-weight="700" font-family="Georgia,serif">${pct}%</text>
    </svg>
  `;
}

function _extractVideoId(embedUrl) {
  const match = String(embedUrl || '').match(/youtube\.com\/embed\/([^?&/]+)/);
  return match ? match[1] : null;
}

function _progressColorClass(pct) {
  if (pct >= 100) return 'is-green';
  if (pct > 50)   return 'is-blue';
  return 'is-red';
}

/** Attention icon for the progress card — color changes by % band */
function _renderProgressAttentionIcon(pct) {
  if (pct >= 100) {
    return `<span class="hd-progress-alert hd-progress-alert--done" aria-label="Conteúdo concluído">
      <i data-lucide="check-circle-2"></i>
    </span>`;
  }
  const colorClass = pct <= 32 ? 'is-red' : pct <= 65 ? 'is-yellow' : 'is-blue';
  return `<span class="hd-progress-alert ${colorClass}" aria-label="Conteúdo pendente: ${pct}%">
    <i data-lucide="alert-triangle"></i>
  </span>`;
}
