/**
 * ti-requests.view.kanban.panels.js
 * Paineis inline do card do Kanban: entrada de KM inicial (F2) e painel de
 * conclusao com KM final + upload de fotos (F2+F3).
 *
 * Extraido de ti-requests.view.kanban.js para respeitar o limite de 500 linhas
 * por modulo. Apenas geracao de markup, sem logica de estado.
 */

import { sanitizeAttribute } from '../../../utils/sanitize.js';

// F2: Painel de KM inicial — exibido ao clicar "Iniciar" em chamados de motorista
export function renderInlineKmStartPanel(ticketId) {
  return `
    <div class="ti-inline-km" data-ti-no-view>
      <p class="ti-inline-km-label">
        <i data-lucide="gauge"></i>
        Informe o KM inicial do veículo:
      </p>
      <input type="number" class="ti-km-input" min="0" placeholder="Ex: 42500"
        data-ti-km-input="${sanitizeAttribute(ticketId)}" />
      <p class="ti-km-error" data-ti-km-error style="display:none">
        Informe um valor de KM inicial válido.
      </p>
      <div class="ti-inline-km-btns">
        <button type="button" class="ti-kc-btn"
          data-ti-confirm-km="${sanitizeAttribute(ticketId)}">
          <i data-lucide="check"></i>Confirmar e Iniciar
        </button>
        <button type="button" class="ti-kc-btn is-cancel" data-ti-cancel-km>
          <i data-lucide="x"></i>Cancelar
        </button>
      </div>
    </div>
  `;
}

// F2+F3: Painel de conclusão — inclui KM final e upload de fotos para motoristas
export function renderInlineConclusionPanel(ticketId, isMotorista = false, kmInicial = null) {
  const kmInicialInfo = isMotorista && kmInicial !== null
    ? `<p class="ti-km-ref"><i data-lucide="gauge"></i> KM inicial registrado: <strong>${kmInicial}</strong></p>`
    : '';
  const kmFinalField = isMotorista ? `
      <p class="ti-inline-conclusion-label">
        <i data-lucide="gauge"></i>
        KM final do veículo:
      </p>
      ${kmInicialInfo}
      <input type="number" class="ti-km-input" min="0" placeholder="Ex: 42800"
        data-ti-km-final-input="${sanitizeAttribute(ticketId)}" />
      <p class="ti-km-final-error" data-ti-km-final-error style="display:none">
        KM final inválido ou menor que o KM inicial.
      </p>` : '';
  const photoUploadSection = isMotorista ? `
      <div class="ti-foto-section">
        <input type="file" accept="image/*" multiple
          data-ti-foto-input="${sanitizeAttribute(ticketId)}"
          style="display:none" />
        <button type="button" class="ti-kc-btn is-upload"
          data-ti-upload-foto="${sanitizeAttribute(ticketId)}">
          <i data-lucide="camera"></i>Adicionar fotos
        </button>
        <div class="ti-foto-preview" data-ti-foto-preview="${sanitizeAttribute(ticketId)}"></div>
        <p class="ti-foto-upload-status" data-ti-foto-status style="display:none"></p>
      </div>` : '';
  return `
    <div class="ti-inline-conclusion" data-ti-no-view>
      ${kmFinalField}
      <p class="ti-inline-conclusion-label">
        <i data-lucide="check-circle"></i>
        Descreva o que foi feito:
      </p>
      <textarea class="ti-conclusion-textarea"
        placeholder="O que foi feito para resolver este chamado…"
        data-ti-obs-input="${sanitizeAttribute(ticketId)}"
        rows="3"
      ></textarea>
      <p class="ti-obs-error" data-ti-obs-error style="display:none">
        Descreva a resolução antes de confirmar.
      </p>
      ${photoUploadSection}
      <div class="ti-inline-conclusion-btns">
        <button type="button" class="ti-kc-btn is-conclude"
          data-ti-confirm-conclusion="${sanitizeAttribute(ticketId)}">
          <i data-lucide="check"></i>Confirmar
        </button>
        <button type="button" class="ti-kc-btn is-cancel" data-ti-cancel-conclusion>
          <i data-lucide="x"></i>Cancelar
        </button>
      </div>
    </div>
  `;
}

