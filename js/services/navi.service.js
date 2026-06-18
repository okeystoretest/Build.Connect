/**
 * navi.service.js
 * Sistema Navi — Trilha de aprendizagem sequencial e hierárquica.
 * Define regras de bloqueio de cards e sequenciamento interno de itens.
 */

import { MODULE_IDS } from '../constants/module.constants.js';
import { SECTOR_IDS } from '../constants/sector.constants.js';
import { isAdminUser, isManagerUser } from './access.service.js';

// ── Thresholds de desbloqueio ────────────────────────────────────────────────

export const NAVI_THRESHOLDS = Object.freeze({
  UNLOCK_WRITTEN: 1.00, // 100% Documentos → libera Instruções Escritas
  UNLOCK_VIDEO:   0.30, // 30%  Inst. Escritas → libera Instruções em Vídeo
  UNLOCK_EVAL:    1.00, // 100% todo conteúdo → libera Avaliações
  UNLOCK_TI:      1.00, // 100% todo conteúdo → libera Requisições (Colaborador)
});

// Módulos cujos ITENS são consumidos em sequência obrigatória
export const SEQUENTIAL_MODULE_IDS = new Set([
  MODULE_IDS.documents,
  MODULE_IDS.writtenInstructions,
  MODULE_IDS.videoInstructions,
]);

// Setores que NÃO participam do Navi (sem módulos de conteúdo padrão)
const NAVI_SKIP_SECTORS = new Set([
  SECTOR_IDS.vitrine,
  SECTOR_IDS.lovclub,
  SECTOR_IDS.dho,
  SECTOR_IDS.motorista,
  SECTOR_IDS.estoque,
]);

/**
 * Retorna true se o setor é elegível para as regras Navi.
 * @param {string} sectorId
 * @returns {boolean}
 */
export function isNaviSector(sectorId) {
  return !NAVI_SKIP_SECTORS.has(String(sectorId || ''));
}

// ── Progresso ────────────────────────────────────────────────────────────────

/**
 * Constrói o objeto de progresso Navi a partir dos dados brutos da API.
 * Regra de zero-item: se um módulo não tem itens, considera-se 100% concluído.
 *
 * @param {{ documento?: number, instrucao_escrita?: number, video?: number }} counts
 * @param {{ documentos?: number, instrucoes_escritas?: number, instrucoes_video?: number }} totals
 * @returns {Record<string, { total: number, consumed: number, pct: number }>}
 */
export function buildNaviProgress(counts, totals) {
  const safePct = (consumed, total) => (total > 0 ? consumed / total : 1.0);

  const docs = { total: totals.documentos || 0, consumed: counts.documento || 0, pct: 0 };
  docs.pct = safePct(docs.consumed, docs.total);

  const written = { total: totals.instrucoes_escritas || 0, consumed: counts.instrucao_escrita || 0, pct: 0 };
  written.pct = safePct(written.consumed, written.total);

  const video = { total: totals.instrucoes_video || 0, consumed: counts.video || 0, pct: 0 };
  video.pct = safePct(video.consumed, video.total);

  return {
    [MODULE_IDS.documents]:           docs,
    [MODULE_IDS.writtenInstructions]: written,
    [MODULE_IDS.videoInstructions]:   video,
  };
}

// ── Lock computation ─────────────────────────────────────────────────────────

/**
 * Calcula o estado de bloqueio de cada card Navi.
 *
 * @param {Record<string, { total: number, consumed: number, pct: number }>} progress
 * @param {object|null} user   Usuário autenticado
 * @param {string} sectorId
 * @returns {Record<string, { locked: boolean, reason: string, pct: number }>}
 */
export function computeNaviLocks(progress, user, sectorId) {
  if (!isNaviSector(sectorId)) return {};
  // Admin: acesso irrestrito e global — nenhum lock aplicado
  if (isAdminUser(user)) return {};

  const docs    = progress[MODULE_IDS.documents]           || { pct: 1.0 };
  const written = progress[MODULE_IDS.writtenInstructions] || { pct: 1.0 };
  const video   = progress[MODULE_IDS.videoInstructions]   || { pct: 1.0 };
  const allDone = docs.pct >= 1.0 && written.pct >= 1.0 && video.pct >= 1.0;

  const locks = {};

  // Instruções Escritas — desbloqueada quando Documentos = 100%
  if (docs.pct < NAVI_THRESHOLDS.UNLOCK_WRITTEN) {
    locks[MODULE_IDS.writtenInstructions] = {
      locked: true,
      reason: `Conclua os Documentos para liberar. (${Math.round(docs.pct * 100)}% concluído)`,
      pct: docs.pct,
    };
  }

  // Instruções em Vídeo — desbloqueada quando Inst. Escritas ≥ 30%
  if (written.pct < NAVI_THRESHOLDS.UNLOCK_VIDEO) {
    locks[MODULE_IDS.videoInstructions] = {
      locked: true,
      reason: `Leia 30% das Instruções Escritas para liberar. (${Math.round(written.pct * 100)}% concluído)`,
      pct: written.pct,
    };
  }

  // Avaliações — bloqueada para Gestores/Admins até 100% do conteúdo
  if (!allDone && (isAdminUser(user) || isManagerUser(user))) {
    locks[MODULE_IDS.evaluation] = {
      locked: true,
      reason: 'Conclua 100% de todo o conteúdo do setor para liberar Avaliações.',
      pct: (docs.pct + written.pct + video.pct) / 3,
    };
  }

  // Requisições TI — bloqueada para TODOS os usuários (não-admin) da Retaguarda
  // até que 100% do conteúdo obrigatório do setor seja integralmente consumido.
  // Regra de bloqueio preventivo: nenhum nível de acesso (colaborador ou gestor)
  // pode contornar esta restrição — apenas administradores são isentos (retorno {} acima).
  if (sectorId === SECTOR_IDS.backoffice && !allDone) {
    locks[MODULE_IDS.tiRequest] = {
      locked: true,
      reason: 'Conclua 100% de todo o conteúdo do setor para liberar Requisições.',
      pct: (docs.pct + written.pct + video.pct) / 3,
    };
  }

  return locks;
}

// ── Sequenciamento de itens ──────────────────────────────────────────────────

/**
 * Retorna true se o item no índice `index` está bloqueado pela sequência Navi.
 * O item N é bloqueado se o refId do item N-1 não constar em consumedRefIds.
 *
 * @param {number} index          Posição do item na lista (0-based)
 * @param {string|null} prevRefId refId do item anterior
 * @param {Set<string>} consumedRefIds
 * @returns {boolean}
 */
export function isItemSequentiallyLocked(index, prevRefId, consumedRefIds) {
  if (index === 0 || !prevRefId) return false;
  return !consumedRefIds.has(prevRefId);
}
