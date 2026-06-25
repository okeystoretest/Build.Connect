/**
 * quality.scoring.js — Helpers de pontuação e markup de registros F10/F11.
 * Extraído de quality.handlers.js para manter módulos abaixo de 500 linhas.
 */

import { sanitizeText } from '../../../utils/sanitize.js';
import {
  WORK_EFFICACY_CRITERIA,
  IE_PERSONAL_CRITERIA,
  IE_SOCIAL_CRITERIA,
} from '../evaluations/evaluation.constants.js';

// ── Helper: extrai score de um item de um registro ───────────────────────

export function _getScore(scores, toolId, criterionId, subId) {
  const key = `${toolId}:${criterionId}:${subId}`;
  return Number(scores?.[key] || 0);
}

// ── Helper: calcula média de um array de valores ─────────────────────────

export function _avg(values) {
  const nonZero = values.filter((v) => v > 0);
  if (!nonZero.length) return null;
  return nonZero.reduce((a, b) => a + b, 0) / nonZero.length;
}

// ── F_10 — Quadro-Resumo de Eficácia no Trabalho ─────────────────────────

export function getQualityEfficacyRecordMarkup(record) {
  // Na lista de resultados cada "record" é de um respondente —
  // este markup mostra o card individual + totais por critério
  const toolId  = record.toolId;
  const scores  = record.scores || {};
  const dateStr = formatEvaluationTimestamp(record.createdAt || record.savedAt);

  return `
    <article class="qr-multidir-card" aria-label="Eficácia — ${sanitizeText(record.respondent?.nome || 'Respondente')}">
      <header class="qr-form-card-header">
        <div class="qr-form-card-tool">
          <span class="qr-form-card-icon"><i data-lucide="target"></i></span>
          <span class="qr-form-card-toolname">Eficácia no Trabalho · ${sanitizeText(record.respondent?.nome || 'Anônimo')}</span>
        </div>
        <time class="qr-form-card-date">${dateStr}</time>
      </header>
      <div class="qr-multidir-table-wrap">
        <table class="qr-multidir-table">
          <thead>
            <tr>
              <th>Competência</th>
              <th class="qr-col-num">A</th>
              <th class="qr-col-num">B</th>
              <th class="qr-col-total">A+B</th>
            </tr>
          </thead>
          <tbody>
            ${WORK_EFFICACY_CRITERIA.map((c) => {
              const a = _getScore(scores, toolId, c.id, 'a');
              const b = _getScore(scores, toolId, c.id, 'b');
              const tot = a && b ? a + b : '—';
              return `
                <tr>
                  <td><span class="qr-et-badge">${sanitizeText(c.label)}</span> ${sanitizeText(c.title)}</td>
                  <td class="qr-col-num">${a || '—'}</td>
                  <td class="qr-col-num">${b || '—'}</td>
                  <td class="qr-col-total">${tot}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

// ── F_11 — Quadro-Resumo de Inteligência Emocional ───────────────────────

export function getQualityIERecordMarkup(record) {
  const toolId  = record.toolId;
  const scores  = record.scores || {};
  const dateStr = formatEvaluationTimestamp(record.createdAt || record.savedAt);

  const totalPessoal = IE_PERSONAL_CRITERIA.reduce((s, c) => s + _getScore(scores, toolId, c.id, 'score'), 0);
  const totalSocial  = IE_SOCIAL_CRITERIA.reduce((s, c) =>   s + _getScore(scores, toolId, c.id, 'score'), 0);
  const totalGeral   = totalPessoal + totalSocial;

  return `
    <article class="qr-multidir-card" aria-label="IE — ${sanitizeText(record.respondent?.nome || 'Respondente')}">
      <header class="qr-form-card-header">
        <div class="qr-form-card-tool">
          <span class="qr-form-card-icon"><i data-lucide="heart-handshake"></i></span>
          <span class="qr-form-card-toolname">Inteligência Emocional · ${sanitizeText(record.respondent?.nome || 'Anônimo')}</span>
        </div>
        <time class="qr-form-card-date">${dateStr}</time>
      </header>

      <div class="qr-multidir-ie-grid">

        <div class="qr-multidir-ie-section">
          <span class="qr-multidir-ie-section-label"><i data-lucide="user-round"></i> Pessoais</span>
          ${IE_PERSONAL_CRITERIA.map((c) => {
            const v = _getScore(scores, toolId, c.id, 'score');
            return `
              <div class="qr-multidir-ie-row">
                <span class="qr-multidir-ie-num">${sanitizeText(c.label)}</span>
                <span class="qr-multidir-ie-name">${sanitizeText(c.title)}</span>
                <span class="qr-multidir-ie-score ${v ? 'has-score' : ''}">${v || '—'}</span>
              </div>`;
          }).join('')}
          <div class="qr-multidir-ie-subtotal">Total pessoal: <strong>${totalPessoal}</strong> / ${IE_PERSONAL_CRITERIA.length * 5}</div>
        </div>

        <div class="qr-multidir-ie-section">
          <span class="qr-multidir-ie-section-label"><i data-lucide="users-round"></i> Sociais</span>
          ${IE_SOCIAL_CRITERIA.map((c) => {
            const v = _getScore(scores, toolId, c.id, 'score');
            return `
              <div class="qr-multidir-ie-row">
                <span class="qr-multidir-ie-num">${sanitizeText(c.label)}</span>
                <span class="qr-multidir-ie-name">${sanitizeText(c.title)}</span>
                <span class="qr-multidir-ie-score ${v ? 'has-score' : ''}">${v || '—'}</span>
              </div>`;
          }).join('')}
          <div class="qr-multidir-ie-subtotal">Total social: <strong>${totalSocial}</strong> / ${IE_SOCIAL_CRITERIA.length * 5}</div>
        </div>

      </div>

      <div class="qr-multidir-ie-total">
        <span>Total Geral</span>
        <strong>${totalGeral}</strong>
        <span class="qr-multidir-ie-total-max">/ ${(IE_PERSONAL_CRITERIA.length + IE_SOCIAL_CRITERIA.length) * 5}</span>
      </div>
    </article>
  `;
}

// ── Configuração de limite de respondentes multidir ───────────────────────

export async function loadMultidirConfigInternal(rootElement, sector) {
  const state = getModuleState(sector.id);
  const currentUi = getQualityUiState(state.ui);

  setModuleState(sector.id, {
    ...state,
    ui: { ...currentUi, multidirConfig: { ...currentUi.multidirConfig, _loading: true } },
  });

  try {
    const configs = await fetchMultidirConfig();
    const latestState = getModuleState(sector.id);
    const latestUi    = getQualityUiState(latestState.ui);

    // Mescla configs recebidas com o estado atual
    const newConfig = { ...latestUi.multidirConfig };
    delete newConfig._loading;
    for (const [toolId, cfg] of Object.entries(configs)) {
      newConfig[toolId] = { ...newConfig[toolId], maxRespondentes: cfg.maxRespondentes };
    }

    setModuleState(sector.id, {
      ...latestState,
      ui: { ...latestUi, multidirConfig: newConfig },
    });
  } catch {
    const latestState = getModuleState(sector.id);
    const latestUi    = getQualityUiState(latestState.ui);
    const newConfig = { ...latestUi.multidirConfig };
    delete newConfig._loading;
    setModuleState(sector.id, { ...latestState, ui: { ...latestUi, multidirConfig: newConfig } });
  }

  renderModuleStage(rootElement, sector);
}

async function saveMultidirConfigHandler(rootElement, sector, toolId, maxRespondentes) {
  const state = getModuleState(sector.id);
  const currentUi = getQualityUiState(state.ui);

  setModuleState(sector.id, {
    ...state,
    ui: { ...currentUi, multidirConfigSaveStatus: 'saving' },
  });
  renderModuleStage(rootElement, sector);

  const response = await saveMultidirConfig({ toolId, maxRespondentes });

  const latestState = getModuleState(sector.id);
  const latestUi    = getQualityUiState(latestState.ui);
  const success = response?.success;

  setModuleState(sector.id, {
    ...latestState,
    ui: {
      ...latestUi,
      multidirConfigSaveStatus: success ? 'success' : 'error',
      multidirConfig: {
        ...latestUi.multidirConfig,
        [toolId]: {
          maxRespondentes: success ? maxRespondentes : (latestUi.multidirConfig[toolId]?.maxRespondentes ?? 5),
          feedback: success ? `Limite atualizado para ${maxRespondentes} respondente(s).` : (response?.message || 'Erro ao salvar.'),
          feedbackType: success ? 'success' : 'error',
        },
      },
    },
  });

  renderModuleStage(rootElement, sector);

  // Limpa o feedback após 4s
  setTimeout(() => {
    const s = getModuleState(sector.id);
    const u = getQualityUiState(s.ui);
    const toolCfg = u.multidirConfig[toolId];
    if (toolCfg?.feedback) {
      setModuleState(sector.id, {
        ...s,
        ui: {
          ...u,
          multidirConfigSaveStatus: '',
          multidirConfig: { ...u.multidirConfig, [toolId]: { ...toolCfg, feedback: '', feedbackType: '' } },
        },
      });
      renderModuleStage(rootElement, sector);
    }
  }, 4000);
}
