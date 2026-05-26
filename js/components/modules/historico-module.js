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
        <p>Pesquise um colaborador ou selecione um setor para dar início ao acompanhamento.</p>
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
  const historico = ui.historico || [];
  const selectedTool = ui.selectedToolId || '';

  if (!historico.length) {
    return `
      <div class="historico-empty">
        <i data-lucide="inbox"></i>
        <p>Nenhuma atividade registrada para <strong>${sanitizeText(ui.selectedUserNome || ui.selectedUserId)}</strong>.</p>
      </div>
    `;
  }

  // Extrai ferramentas únicas das hashtags (#ferramenta) no final dos títulos
  const toolsMap = new Map();
  historico.forEach(item => {
    const match = String(item.titulo || '').match(/#([\w\-\u00C0-\u024F ]+)$/);
    if (match) { const t = match[1].trim(); if (t) toolsMap.set(t.toLowerCase(), t); }
  });
  const tools = [...toolsMap.entries()];

  const filtered = selectedTool
    ? historico.filter(item => {
        const match = String(item.titulo || '').match(/#([\w\-\u00C0-\u024F ]+)$/);
        return match && match[1].trim().toLowerCase() === selectedTool;
      })
    : historico;

  return `
    <div class="historico-timeline-header">
      <strong>${sanitizeText(ui.selectedUserNome || ui.selectedUserId)}</strong>
      <span class="historico-count">${filtered.length} atividade${filtered.length !== 1 ? 's' : ''}</span>
    </div>

    ${tools.length ? `
      <div class="historico-tool-btns">
        ${tools.map(([id, label]) =>
          `<button type="button"
            class="historico-sector-btn ${selectedTool === id ? 'is-active' : ''}"
            data-historico-tool="${sanitizeAttribute(id)}">
            #${sanitizeText(label)}
          </button>`
        ).join('')}
      </div>
    ` : ''}

    <ol class="historico-timeline" aria-label="Linha do tempo de atividades">
      ${filtered.length ? filtered.map(renderTimelineItem).join('') : `
        <li class="historico-empty" style="list-style:none;padding:20px 0">
          <p>Nenhuma atividade com #${sanitizeText(selectedTool)}.</p>
        </li>`}
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

  // Só mostra "sem atividade" se o setor também não está disponível para comparação
  // (evita flash quando loadContentData ainda não iniciou)
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

  // Questionários
  const quizzesAvail   = Array.isArray(content?.quizzesAvail)   ? content.quizzesAvail   : [];
  const quizzesAnswered = Array.isArray(content?.quizzesAnswered) ? content.quizzesAnswered : [];
  const quizzesCorr    = quizzesAnswered.filter(r => r.is_correta);

  const totalDisp   = videosDisp.length + docsDisp.length + instrDisp.length + quizzesAvail.length;
  const totalConsum = videosConsum.length + docsConsum.length + instrConsum.length + quizzesAnswered.length;
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
    {
      label: 'Questionários',
      icon: 'help-circle',
      color: '#10B981',
      disponivel: quizzesAvail.length,
      consumido: quizzesAnswered.length,
      itensDisp: [],
      refPrefix: '',
      extra: quizzesAvail.length > 0
        ? `${quizzesCorr.length}/${quizzesAnswered.length} corretas`
        : null,
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

      <!-- Linha principal: anel + barras por categoria -->
      <div class="hd-main-row">
        <div class="hd-ring-card">
          <div class="hd-card-head"><i data-lucide="target"></i><span>Progresso Geral</span></div>
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
                      <div class="hd-kpi-row-fill ${progressColorClass(pct)}" style="width:${pct}%"></div>
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

      <!-- Indicadores detalhados -->
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

function renderProgressRing(pct) {
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
      <text x="55" y="60" text-anchor="middle" dominant-baseline="middle"
        fill="var(--text)" font-size="20" font-weight="700" font-family="Georgia,serif">${pct}%</text>
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
        <div class="hd-cat-fill ${progressColorClass(pct)}" style="width:${pct}%"></div>
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
// Cor da barra de progresso: ≤50% vermelho, 51-99% azul, 100% verde
function progressColor(pct) {
  if (pct >= 100) return '#10B981';
  if (pct > 50)   return '#3B82F6';
  return '#EF4444';
}

function progressColorClass(pct) {
  if (pct >= 100) return 'is-green';
  if (pct > 50)   return 'is-blue';
  return 'is-red';
}