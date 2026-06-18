import {
  DOCUMENT_MODULE_IDS,
  MODULE_IDS,
  MODULE_STATUS,
  VIDEO_MODULE_IDS,
} from '../../constants/module.constants.js';
import { getCardsForSector } from '../../services/navigation.service.js';
import { sanitizeText } from '../../utils/sanitize.js';
import { getDocumentModuleMarkup } from './document-module.js';
import {
  getInternalModuleMarkup,
  getModuleEmptyMarkup,
  getModuleErrorMarkup,
  getModuleLoadingMarkup,
  getModuleSearchEmptyMarkup,
  getModuleToolbarMarkup,
  getModuleToolFilterMarkup,
} from './module-shell.js';
import { getVideoModuleMarkup } from './video-module.js';
import { getFeedbackModuleMarkup } from './feedback-module.js';
import { getUserManagementModuleMarkup } from './user-admin-module.js';
import { getEvaluationModuleMarkup } from './evaluation-module.js';
import { getQualityModuleMarkup } from './quality-module.js';
import { getTiRequestsModuleMarkup } from './ti-requests-module.js';
import { getHistoricoModuleMarkup } from './historico-module.js';
import { getQuestionariosModuleMarkup } from './questionarios-module.js';
import { VITRINE_CATEGORY_MODULE_IDS } from './vitrine/vitrine.constants.js';
import { getVitrineModuleMarkup } from './vitrine/vitrine.view.js';

export function getModuleStageMarkup(sector, stageState) {
  if (!stageState.selectedModuleId) {
    return `
      <div class="module-shell is-empty" data-module-shell>
        <div class="module-shell-header">
          <div>
            <p class="module-eyebrow">Conteúdo do módulo</p>
            <h2 class="module-title">Selecione um card para continuar</h2>
            <p class="module-description">
              Escolha um dos módulos acima para abrir documentos, instruções ou vídeos relacionados ao setor ${sanitizeText(sector.label)}.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  const selectedCard = getCardsForSector(sector.id).find((card) => card.id === stageState.selectedModuleId);

  if (!selectedCard) {
    return '';
  }

  if (stageState.status === MODULE_STATUS.loading) {
    return getModuleLoadingMarkup(selectedCard);
  }

  if (stageState.status === MODULE_STATUS.error) {
    return getModuleErrorMarkup(selectedCard, stageState.errorMessage);
  }

  if (VIDEO_MODULE_IDS.has(stageState.selectedModuleId)) {
    return getVideoModuleMarkup(selectedCard, stageState.moduleData, stageState.ui, {
      getModuleEmptyMarkup,
      getModuleToolbarMarkup,
      getModuleSearchEmptyMarkup,
      getModuleToolFilterMarkup,
    });
  }

  if (DOCUMENT_MODULE_IDS.has(stageState.selectedModuleId)) {
    return getDocumentModuleMarkup(selectedCard, stageState.moduleData, stageState.ui, {
      getModuleEmptyMarkup,
      getModuleToolbarMarkup,
      getModuleSearchEmptyMarkup,
      getModuleToolFilterMarkup,
    });
  }

  if (stageState.selectedModuleId === MODULE_IDS.userAdmin) {
    return getUserManagementModuleMarkup(selectedCard, stageState.moduleData, stageState.ui);
  }

  if (stageState.selectedModuleId === MODULE_IDS.evaluation) {
    return getEvaluationModuleMarkup(selectedCard, stageState.moduleData, stageState.ui);
  }

  if (stageState.selectedModuleId === MODULE_IDS.feedback) {
    return getFeedbackModuleMarkup(selectedCard, stageState.moduleData, stageState.ui);
  }

  if (stageState.selectedModuleId === MODULE_IDS.quality) {
    return getQualityModuleMarkup(selectedCard, stageState.moduleData, stageState.ui);
  }

  if (stageState.selectedModuleId === MODULE_IDS.tiRequest ||
      stageState.selectedModuleId === MODULE_IDS.motorRequests) {
    return getTiRequestsModuleMarkup(selectedCard, stageState.moduleData, stageState.ui);
  }

  if (stageState.selectedModuleId === MODULE_IDS.historico) {
    return getHistoricoModuleMarkup(selectedCard, stageState.moduleData, stageState.ui?.historico || {});
  }

  if (stageState.selectedModuleId === MODULE_IDS.questionarios) {
    return getQuestionariosModuleMarkup(selectedCard, stageState.moduleData, stageState.ui?.questionarios || {});
  }

  if (VITRINE_CATEGORY_MODULE_IDS.has(stageState.selectedModuleId)) {
    return getVitrineModuleMarkup(selectedCard, stageState.moduleData, stageState.ui);
  }

  return getInternalModuleMarkup(selectedCard);
}
