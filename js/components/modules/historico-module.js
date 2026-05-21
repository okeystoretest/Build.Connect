import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';
import { USER_ADMIN_SECTOR_OPTIONS } from '../../constants/sector.constants.js';

const TIPO_CONFIG = {
  video:            { icon: 'play-circle',     label: 'Vídeo assistido',  color: '#D4A257' },
  documento:        { icon: 'file-text',       label: 'Documento lido',   color: '#3B82F6' },
  instrucao_escrita:{ icon: 'book-open',       label: 'Instrução lida',   color: '#3B82F6' },
  avaliacao:        { icon: 'clipboard-check', label: 'Avaliação',        color: '#10B981' },
  feedback:         { icon: 'message-square',  label: 'Feedback recebido',color: '#8B5CF6' },
};

export function getHistoricoModuleMarkup(card, moduleData, ui) {
  return `
    <div class="module-shell historico-shell" data-module-shell>
      <div class="module-shell-header">
        <div>
          <p class="module-eyebrow">DHO</p>
          <h2 class="module-title">${sanitizeText(card.title)}</h2>
          <p class="module-description">Consulte o percurso e o acompanhamento de conteúdo de um colaborador.</p>
        </div>
      </div>

      <div class="historico-search-row">
        <div class="historico-search-wrap">
          <input
            class="historico-search-input"
            type="text"
            placeholder="Pesquisar colaborador por ID ou nome..."
            value="${sanitizeAttribute(ui.query || '')}"
            data-historico-search
            autocomplete="off"
          />
          <button type="button" class="module-action-button" data-historico-search-btn>
            <i data-lucide="search"></i>
            <span>Buscar</span>
          </button>
        </div>

        <div class="historico-sector-btns">
          ${USER_ADMIN_SECTOR_OPTIONS.map(s => `
            <button
              type="button"
              class="historico-sector-btn ${ui.selectedSectorId === s.id ? 'is-active' : ''}"
              data-historico-sector="${sanitizeAttribute(s.id)}"
            >
              ${sanitizeText(s.label)}
            </button>
          `).join('')}
        </div>

        ${ui.searchResults?.length ? renderUserResults(ui) : ''}
      </div>

      ${renderHistoricoContent(ui)}
    </div>
  `;
}

function renderUserResults(ui) {
  return `
    <div class="historico-user-results">
      ${ui.searchResults.map((user) => `
        <button
          type="button"
          class="historico-user-option ${ui.selectedUserId === user.id ? 'is-selected' : ''}"
          data-historico-select-user="${sanitizeAttribute(user.id)}"
        >
          <i data-lucide="user"></i>
          <span>${sanitizeText(user.nome)}</span>
          <small>${sanitizeText(user.id)}</small>
        </button>
      `).join('')}
    </div>
  `;
}

function renderHistoricoContent(ui) {
  if (!ui.selectedUserId) {
    return `
      <div class="historico-empty">
        <i data-lucide="user-search"></i>
        <p>Pesquise um colaborador para ver o histórico e o dashboard de acompanhamento.</p>
      </div>
    `;
  }

  if (ui.loadingHistorico) {
    return `
      <div class="historico-loading">
        <i data-lucide="loader-circle"></i>
        <p>Carregando dados...</p>
      </div>
    `;
  }

  const activeTab = ui.activeTab || 'timeline';

  return `
    <div class="historico-tabs">
      <button type="button"
        class="historico-tab ${activeTab === 'timeline' ? 'is-active' : ''}"
        data-historico-tab="timeline">
        <i data-lucide="clock"></i>
        <span>Linha do Tempo</span>
      </button>
      <button type="button"
        class="historico-tab ${activeTab === 'dashboard' ? 'is-active' : ''}"
        data-historico-tab="dashboard">
        <i data-lucide="layout-dashboard"></i>
        <span>Dashboard de Acompanhamento</span>
      </button>
    </div>

    ${activeTab === 'dashboard'
      ? renderDashboard(ui)
      : renderTimeline(ui)
    }
  `;
}

// ── Timeline ───────────────────────────────────────────────────────────────

function renderTimeline(ui) {
  if (!ui.historico?.length) {
    return `
      <div class="historico-empty">
        <i data-lucide="inbox"></i>
        <p>Nenhuma atividade registrada para <strong>${sanitizeText(ui.selectedUserNome || ui.selectedUserId)}</strong>.</p>
      </div>
    `;
  }

  return `
    <div class="historico-timeline-header">
      <strong>${sanitizeText(ui.selectedUserNome || ui.selectedUserId)}</strong>
      <span class="historico-count">${ui.historico.length} atividade${ui.historico.length !== 1 ? 's' : ''}</span>
    </div>
    <ol class="historico-timeline" aria-label="Linha do tempo de atividades">
      ${ui.historico.map(renderTimelineItem).join('')}
    </ol>
  `;
}

function renderTimelineItem(item) {
  const config = TIPO_CONFIG[item.tipo] || { icon: 'circle-dot', label: item.tipo, color: 'var(--muted)' };
  const date = formatDate(item.concluidoEm);

  return `
    <li class="historico-item" data-tipo="${sanitizeAttribute(item.tipo)}">
      <div class="historico-item-icon" style="color:${config.color};border-color:${config.color}30;">
        <i data-lucide="${sanitizeAttribute(config.icon)}"></i>
      </div>
      <div class="historico-item-body">
        <span class="historico-item-label">${sanitizeText(config.label)}</span>
        <p class="historico-item-title">${sanitizeText(item.titulo)}</p>
        ${item.subtitulo ? `<p class="historico-item-sub">${sanitizeText(item.subtitulo)}</p>` : ''}
        <time class="historico-item-date" datetime="${sanitizeAttribute(item.concluidoEm)}">${sanitizeText(date)}</time>
      </div>
    </li>
  `;
}

// ── Dashboard de Acompanhamento ────────────────────────────────────────────

function renderDashboard(ui) {
  const historico = ui.historico || [];

  if (!historico.length && !ui.loadingContent && !ui.contentData) {
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

  const content = ui.contentData;
  const refIds = new Set(historico.map(h => h.referenciaId).filter(Boolean));

  // Vídeos
  const videosDisp = content?.videos || [];
  const videosConsum = videosDisp.filter(v => {
    const vid = extractVideoId(v.embedUrl || '');
    return vid && refIds.has(`video-${vid}`);
  });

  // Documentos
  const docsDisp = content?.docs || [];
  const docsConsum = docsDisp.filter(d =>
    d.previewUrl && refIds.has((`doc-${d.previewUrl}`).slice(0, 128))
  );

  // Instruções escritas
  const instrDisp = content?.instrucoes || [];
  const instrConsum = instrDisp.filter(i =>
    i.previewUrl && refIds.has((`doc-${i.previewUrl}`).slice(0, 128))
  );

  const totalDisp   = videosDisp.length + docsDisp.length + instrDisp.length;
  const totalConsum = videosConsum.length + docsConsum.length + instrConsum.length;
  const pctGeral    = totalDisp > 0 ? Math.round((totalConsum / totalDisp) * 100) : 0;

  const categorias = [
    {
      label: 'Vídeos',
      icon: 'play-circle',
      color: '#D4A257',
      disponivel: videosDisp.length,
      consumido: videosConsum.length,
      itensDisp: videosDisp,
      refPrefix: 'video',
    },
    {
      label: 'Documentos',
      icon: 'file-text',
      color: '#3B82F6',
      disponivel: docsDisp.length,
      consumido: docsConsum.length,
      itensDisp: docsDisp,
      refPrefix: 'doc',
    },
    {
      label: 'Instruções Escritas',
      icon: 'book-open',
      color: '#6366F1',
      disponivel: instrDisp.length,
      consumido: instrConsum.length,
      itensDisp: instrDisp,
      refPrefix: 'doc',
    },
  ].filter(c => c.disponivel > 0);

  if (!content && !historico.length) {
    return `
      <div class="historico-empty">
        <i data-lucide="inbox"></i>
        <p>Sem dados disponíveis.</p>
      </div>
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

      <!-- Progresso geral -->
      <div class="hd-progress-card">
        <div class="hd-progress-ring-wrap">
          ${renderProgressRing(pctGeral, totalConsum, totalDisp)}
        </div>
        <div class="hd-progress-info">
          <h3 class="hd-progress-title">Progresso Geral de Conteúdo</h3>
          <p class="hd-progress-subtitle">
            <strong>${totalConsum}</strong> de <strong>${totalDisp}</strong> conteúdos consumidos
          </p>
          <div class="hd-progress-bar-wrap">
            <div class="hd-progress-bar-track">
              <div class="hd-progress-bar-fill" style="width:${pctGeral}%"></div>
            </div>
            <span class="hd-progress-pct">${pctGeral}%</span>
          </div>
        </div>
      </div>

      <!-- Por categoria -->
      <div class="hd-categoria-grid">
        ${categorias.map(c => renderCategoriaCard(c, refIds)).join('')}
      </div>

      <!-- Itens pendentes -->
      ${renderItensPendentes(categorias, refIds)}

      `}
    </div>
  `;
}

function renderHistoricoOnlyDashboard(historico) {
  const videos     = historico.filter(h => h.tipo === 'video').length;
  const docs       = historico.filter(h => h.tipo === 'documento').length;
  const instrucoes = historico.filter(h => h.tipo === 'instrucao_escrita').length;
  const avaliacoes = historico.filter(h => h.tipo === 'avaliacao').length;

  return `
    <div class="hd-kpi-grid">
      <div class="hd-kpi hd-kpi-video">
        <i data-lucide="play-circle"></i>
        <div><span class="hd-kpi-value">${videos}</span><span class="hd-kpi-label">Vídeos assistidos</span></div>
      </div>
      <div class="hd-kpi hd-kpi-doc">
        <i data-lucide="files"></i>
        <div><span class="hd-kpi-value">${docs + instrucoes}</span><span class="hd-kpi-label">Documentos lidos</span></div>
      </div>
      <div class="hd-kpi hd-kpi-aval">
        <i data-lucide="clipboard-check"></i>
        <div><span class="hd-kpi-value">${avaliacoes}</span><span class="hd-kpi-label">Avaliações</span></div>
      </div>
    </div>
    <p class="hd-empty-small">Conteúdo do setor não disponível para comparação. Verifique se o setor do colaborador está configurado.</p>
  `;
}

function renderProgressRing(pct, consumed, total) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const gap  = circ - dash;
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
      <text x="55" y="51" text-anchor="middle" fill="var(--text)" font-size="18" font-weight="700" font-family="Georgia,serif">${pct}%</text>
      <text x="55" y="66" text-anchor="middle" fill="var(--muted)" font-size="9" font-family="Calibri,sans-serif">${consumed}/${total}</text>
    </svg>
  `;
}

function renderCategoriaCard(c, refIds) {
  const pct = c.disponivel > 0 ? Math.round((c.consumido / c.disponivel) * 100) : 0;
  const pendente = c.disponivel - c.consumido;

  return `
    <div class="hd-cat-card">
      <div class="hd-cat-header">
        <div class="hd-cat-icon" style="color:${c.color};background:${c.color}18">
          <i data-lucide="${sanitizeAttribute(c.icon)}"></i>
        </div>
        <div>
          <span class="hd-cat-label">${sanitizeText(c.label)}</span>
          <span class="hd-cat-meta">${c.consumido}/${c.disponivel} · ${pendente} pendente${pendente !== 1 ? 's' : ''}</span>
        </div>
        <span class="hd-cat-pct" style="color:${c.color}">${pct}%</span>
      </div>
      <div class="hd-cat-track">
        <div class="hd-cat-fill" style="width:${pct}%;background:${c.color}"></div>
      </div>
    </div>
  `;
}

function renderItensPendentes(categorias, refIds) {
  const pendentes = [];

  for (const c of categorias) {
    for (const item of c.itensDisp) {
      const refId = c.refPrefix === 'video'
        ? `video-${extractVideoId(item.embedUrl || '')}`
        : (`doc-${item.previewUrl || ''}`).slice(0, 128);

      const consumido = refIds.has(refId);
      const titulo = item.title || item.name || 'Sem título';

      pendentes.push({ titulo, tipo: c.label, icon: c.icon, color: c.color, consumido });
    }
  }

  if (!pendentes.length) return '';

  const feitos    = pendentes.filter(p => p.consumido);
  const naFeitos  = pendentes.filter(p => !p.consumido);

  return `
    <div class="hd-card">
      <div class="hd-card-head">
        <i data-lucide="list-checks"></i>
        <span>Conteúdo disponível</span>
        <span style="margin-left:auto;font-size:0.72rem;color:var(--muted)">
          ${feitos.length} concluído${feitos.length !== 1 ? 's' : ''} · ${naFeitos.length} pendente${naFeitos.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div class="hd-items-list">
        ${naFeitos.map(p => renderItemRow(p)).join('')}
        ${feitos.map(p => renderItemRow(p)).join('')}
      </div>
    </div>
  `;
}

function renderItemRow(p) {
  return `
    <div class="hd-item-row ${p.consumido ? 'is-done' : ''}">
      <div class="hd-item-check ${p.consumido ? 'is-done' : ''}">
        ${p.consumido ? `<i data-lucide="check"></i>` : ''}
      </div>
      <i data-lucide="${sanitizeAttribute(p.icon)}" class="hd-item-type-icon" style="color:${p.color}"></i>
      <span class="hd-item-titulo">${sanitizeText(p.titulo)}</span>
      <span class="hd-item-badge" style="color:${p.color};background:${p.color}12">${sanitizeText(p.tipo)}</span>
    </div>
  `;
}

function extractVideoId(embedUrl) {
  const match = String(embedUrl || '').match(/youtube\.com\/embed\/([^?&/]+)/);
  return match ? match[1] : null;
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch { return iso; }
}