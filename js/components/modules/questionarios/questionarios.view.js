import { sanitizeAttribute, sanitizeText } from '../../../utils/sanitize.js';
import { QUIZ_SECTOR_OPTIONS } from './questionarios.constants.js';

export function getQuestionariosModuleMarkup(card, moduleData, moduleUi) {
  const ui = moduleUi || {};

  return ui.mode === 'form'
    ? getQuizFormMarkup(card, ui)
    : getQuizListMarkup(card, ui);
}

// ── LIST VIEW ─────────────────────────────────────────────────────────────

function getQuizListMarkup(card, ui) {
  return `
    <div class="module-shell quiz-shell" data-module-shell>
      <div class="module-shell-header module-shell-header--stacked">
        <div>
          <p class="module-eyebrow">DHO · Questionários</p>
          <h2 class="module-title">${sanitizeText(card.title)}</h2>
          <p class="module-description">Gerencie os questionários vinculados aos vídeos de instrução. Cada vídeo pode ter uma pergunta com 3 alternativas.</p>
        </div>
        <div class="quiz-list-actions">
          <button type="button" class="module-action-button" data-quiz-new>
            <i data-lucide="plus"></i>
            <span>Novo questionário</span>
          </button>
        </div>
      </div>

      ${getSectorFilterMarkup(ui)}
      ${getQuizListBodyMarkup(ui)}
    </div>
  `;
}

function getSectorFilterMarkup(ui) {
  return `
    <div class="quiz-filter-row">
      <label class="quiz-filter-label">Filtrar por setor</label>
      <select class="quiz-sector-select" data-quiz-filter-sector>
        <option value="">Todos os setores</option>
        ${QUIZ_SECTOR_OPTIONS.map((s) => `
          <option value="${sanitizeAttribute(s.id)}" ${ui.selectedSectorId === s.id ? 'selected' : ''}>
            ${sanitizeText(s.label)}
          </option>
        `).join('')}
      </select>
    </div>
  `;
}

function getQuizListBodyMarkup(ui) {
  if (ui.quizzesLoading) {
    return `
      <div class="empty-state is-compact">
        <span class="empty-state-icon"><i data-lucide="loader-circle"></i></span>
        <div><h3 class="card-title">Carregando questionários...</h3></div>
      </div>
    `;
  }

  const list = Array.isArray(ui.quizzes) ? ui.quizzes : [];

  if (!list.length) {
    return `
      <div class="empty-state is-compact">
        <span class="empty-state-icon"><i data-lucide="help-circle"></i></span>
        <div>
          <h3 class="card-title">Nenhum questionário cadastrado</h3>
          <p class="card-description">Clique em "Novo questionário" para criar o primeiro.</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="quiz-list">
      ${list.map(renderQuizItem).join('')}
    </div>
  `;
}

function renderQuizItem(quiz) {
  return `
    <div class="quiz-list-item">
      <div class="quiz-list-item-info">
        <span class="quiz-list-sector-badge">${sanitizeText(quiz.sector_id || '—')}</span>
        <strong class="quiz-list-video-title">${sanitizeText(quiz.video_title || quiz.video_id || '—')}</strong>
        <p class="quiz-list-pergunta">${sanitizeText(quiz.pergunta || '')}</p>
        <div class="quiz-list-opcoes">
          ${['a', 'b', 'c'].map((opt) => `
            <span class="quiz-list-opcao ${quiz.gabarito === opt ? 'is-correct' : ''}">
              <strong>${opt.toUpperCase()})</strong> ${sanitizeText(quiz[`opcao_${opt}`] || '')}
              ${quiz.gabarito === opt ? '<i data-lucide="check-circle-2"></i>' : ''}
            </span>
          `).join('')}
        </div>
      </div>
      <button type="button" class="module-control-button quiz-edit-btn"
        data-quiz-edit="${sanitizeAttribute(quiz.id)}"
        aria-label="Editar questionário">
        <i data-lucide="pencil"></i>
      </button>
    </div>
  `;
}

// ── FORM VIEW ─────────────────────────────────────────────────────────────

function getQuizFormMarkup(card, ui) {
  const isEditing = !!ui.editingQuizId;
  const form = ui.form || {};

  return `
    <div class="module-shell quiz-shell" data-module-shell>
      <div class="module-shell-header module-shell-header--stacked">
        <div>
          <button type="button" class="module-link-button is-secondary" data-quiz-back>
            <i data-lucide="arrow-left"></i>
            <span>Ver questionários</span>
          </button>
          <p class="module-eyebrow">DHO · Questionários</p>
          <h2 class="module-title">${isEditing ? 'Editar questionário' : 'Novo questionário'}</h2>
        </div>
      </div>

      ${!isEditing ? getVideoSelectorMarkup(ui) : getEditingVideoInfoMarkup(ui)}

      ${(ui.selectedVideoId || isEditing) ? getFormBodyMarkup(form, ui) : ''}
    </div>
  `;
}

function getVideoSelectorMarkup(ui) {
  return `
    <div class="quiz-form-section">
      <h3 class="quiz-section-title">1. Selecione o vídeo</h3>

      <div class="quiz-sector-video-row">
        <label class="form-field quiz-form-field">
          <span class="form-label">Setor</span>
          <select class="quiz-sector-select" data-quiz-sector>
            <option value="">Selecione um setor...</option>
            ${QUIZ_SECTOR_OPTIONS.map((s) => `
              <option value="${sanitizeAttribute(s.id)}" ${ui.selectedSectorId === s.id ? 'selected' : ''}>
                ${sanitizeText(s.label)}
              </option>
            `).join('')}
          </select>
        </label>

        ${ui.selectedSectorId ? getVideoPickerMarkup(ui) : ''}
      </div>
    </div>
  `;
}

function getVideoPickerMarkup(ui) {
  if (ui.videosLoading) {
    return `
      <div class="quiz-videos-loading">
        <i data-lucide="loader-circle"></i>
        <span>Carregando vídeos...</span>
      </div>
    `;
  }

  if (ui.videosError) {
    return `
      <div class="quiz-videos-error">
        <i data-lucide="alert-triangle"></i>
        <span>Não foi possível carregar os vídeos.</span>
      </div>
    `;
  }

  const videos = Array.isArray(ui.videos) ? ui.videos : [];

  if (!videos.length) {
    return `
      <div class="quiz-videos-empty">
        <i data-lucide="video-off"></i>
        <span>Nenhum vídeo encontrado para este setor.</span>
      </div>
    `;
  }

  return `
    <label class="form-field quiz-form-field">
      <span class="form-label">Vídeo</span>
      <select class="quiz-sector-select" data-quiz-video>
        <option value="">Selecione um vídeo...</option>
        ${videos.map((v) => `
          <option
            value="${sanitizeAttribute(v.id)}"
            data-video-title="${sanitizeAttribute(v.title || '')}"
            ${ui.selectedVideoId === v.id ? 'selected' : ''}>
            ${sanitizeText(v.title || v.id)}
          </option>
        `).join('')}
      </select>
    </label>
  `;
}

function getEditingVideoInfoMarkup(ui) {
  return `
    <div class="quiz-editing-video-info">
      <i data-lucide="video"></i>
      <span>${sanitizeText(ui.selectedVideoTitle || ui.selectedVideoId || 'Vídeo')}</span>
    </div>
  `;
}

function getFormBodyMarkup(form, ui) {
  const isEditing = !!ui.editingQuizId;

  return `
    <div class="quiz-form-section">
      <h3 class="quiz-section-title">${isEditing ? '2. Edite a pergunta' : '2. Configure a pergunta'}</h3>

      <label class="form-field quiz-form-field quiz-form-field--full">
        <span class="form-label">Pergunta <span class="form-required">*</span></span>
        <textarea
          class="quiz-textarea"
          rows="3"
          placeholder="Digite a pergunta do questionário..."
          data-quiz-field="pergunta"
        >${sanitizeText(form.pergunta || '')}</textarea>
      </label>

      <div class="quiz-opcoes-grid">
        ${['a', 'b', 'c'].map((opt) => `
          <div class="quiz-opcao-row">
            <label class="quiz-opcao-label ${form.gabarito === opt ? 'is-correct' : ''}">
              <input
                type="radio"
                name="quiz-gabarito"
                value="${opt}"
                data-quiz-gabarito
                ${form.gabarito === opt ? 'checked' : ''}
                title="Marcar opção ${opt.toUpperCase()} como resposta correta"
              />
              <span class="quiz-opcao-letter">${opt.toUpperCase()}</span>
              <i data-lucide="${form.gabarito === opt ? 'check-circle-2' : 'circle'}" class="quiz-correct-icon"></i>
            </label>
            <input
              type="text"
              class="quiz-opcao-input"
              placeholder="Texto da alternativa ${opt.toUpperCase()}..."
              value="${sanitizeAttribute(form[`opcao_${opt}`] || '')}"
              data-quiz-field="opcao_${opt}"
            />
          </div>
        `).join('')}
      </div>

      <p class="quiz-gabarito-hint">
        <i data-lucide="info"></i>
        Clique no botão à esquerda de cada alternativa para marcá-la como correta (gabarito).
      </p>

      ${ui.saveMessage ? `
        <p class="quiz-save-message ${ui.saveError ? 'is-error' : 'is-success'}">
          <i data-lucide="${ui.saveError ? 'x-circle' : 'check-circle'}"></i>
          ${sanitizeText(ui.saveMessage)}
        </p>
      ` : ''}

      <div class="quiz-form-actions">
        ${isEditing ? `
          <button type="button" class="module-link-button is-danger"
            data-quiz-delete="${sanitizeAttribute(ui.editingQuizId)}"
            ${ui.isDeleting ? 'disabled' : ''}>
            <i data-lucide="trash-2"></i>
            <span>${ui.isDeleting ? 'Excluindo...' : 'Excluir'}</span>
          </button>
        ` : ''}
        <button type="button" class="module-action-button"
          data-quiz-save
          ${ui.isSaving ? 'disabled' : ''}>
          <i data-lucide="save"></i>
          <span>${ui.isSaving ? 'Salvando...' : 'Salvar questionário'}</span>
        </button>
      </div>
    </div>
  `;
}
