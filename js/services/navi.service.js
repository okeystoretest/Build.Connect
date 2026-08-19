/**
 * navi.service.js
 * Sistema Navi — Trilha de aprendizagem sequencial e hierárquica.
 * Define regras de bloqueio de cards e sequenciamento interno de itens.
 */

import { MODULE_IDS } from '../constants/module.constants.js';
import { SECTOR_IDS } from '../constants/sector.constants.js';
import { isAdminUser } from './access.service.js';
import { getAuthenticatedUser } from './auth.service.js';

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
 *
 * Regra de zero-item: se um módulo não tem itens cadastrados, considera-se
 * automaticamente concluído (pct = 1.0) e MARCADO como sem conteúdo (hasContent = false).
 * O campo `hasContent` permite que `computeNaviLocks` desconsidere módulos
 * vazios no cálculo de progresso exibido ao usuário e na média de conclusão.
 *
 * @param {{ documento?: number, instrucao_escrita?: number, video?: number }} counts
 * @param {{ documentos?: number, instrucoes_escritas?: number, instrucoes_video?: number }} totals
 * @returns {Record<string, { total: number, consumed: number, pct: number, hasContent: boolean }>}
 */
export function buildNaviProgress(counts, totals) {
  const safePct = (consumed, total) => (total > 0 ? consumed / total : 1.0);

  const docsTotal    = totals.documentos         || 0;
  const writtenTotal = totals.instrucoes_escritas || 0;
  const videoTotal   = totals.instrucoes_video    || 0;

  const docs = {
    total:      docsTotal,
    consumed:   counts.documento        || 0,
    pct:        0,
    hasContent: docsTotal > 0,
  };
  docs.pct = safePct(docs.consumed, docs.total);

  const written = {
    total:      writtenTotal,
    consumed:   counts.instrucao_escrita || 0,
    pct:        0,
    hasContent: writtenTotal > 0,
  };
  written.pct = safePct(written.consumed, written.total);

  const video = {
    total:      videoTotal,
    consumed:   counts.video            || 0,
    pct:        0,
    hasContent: videoTotal > 0,
  };
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
 * FIX #1 — Progresso com categorias vazias:
 *   • `allDone` e a percentagem exibida ao usuário são computados APENAS
 *     com base nos módulos que possuem conteúdo cadastrado (hasContent = true).
 *   • Módulos com 0 itens são automaticamente considerados concluídos e
 *     IGNORADOS no denominador da média de progresso.
 *
 * FIX #2 — Lock robusto de Avaliações / Requisições:
 *   • A validação usa o estado em memória, não atributos do DOM, eliminando
 *     a janela de bypass durante o carregamento assíncrono dos dados.
 *
 * @param {Record<string, { total: number, consumed: number, pct: number, hasContent: boolean }>} progress
 * @param {object|null} user   Usuário autenticado
 * @param {string} sectorId
 * @returns {Record<string, { locked: boolean, reason: string, pct: number }>}
 */
export function computeNaviLocks(progress, user, sectorId) {
  if (!isNaviSector(sectorId)) return {};
  // Admin: acesso irrestrito — nenhum lock aplicado
  if (isAdminUser(user)) return {};

  const docs    = progress[MODULE_IDS.documents]           || { pct: 1.0, hasContent: false };
  const written = progress[MODULE_IDS.writtenInstructions] || { pct: 1.0, hasContent: false };
  const video   = progress[MODULE_IDS.videoInstructions]   || { pct: 1.0, hasContent: false };

  // Calcula allDone e percentagem SOMENTE com módulos que têm conteúdo.
  // Módulos com 0 itens não interferem no denominador da média.
  const activeModules = [docs, written, video].filter((m) => m.hasContent);
  const allDone  = activeModules.length === 0 || activeModules.every((m) => m.pct >= 1.0);
  const activePct = activeModules.length > 0
    ? activeModules.reduce((sum, m) => sum + m.pct, 0) / activeModules.length
    : 1.0;

  const locks = {};

  // Instruções Escritas — desbloqueada quando Documentos = 100%
  // Só aplica se Documentos possui conteúdo cadastrado.
  if (docs.hasContent && docs.pct < NAVI_THRESHOLDS.UNLOCK_WRITTEN) {
    locks[MODULE_IDS.writtenInstructions] = {
      locked: true,
      reason: `Conclua os Documentos para liberar. (${Math.round(docs.pct * 100)}% concluído)`,
      pct: docs.pct,
    };
  }

  // Instruções em Vídeo — desbloqueada quando Inst. Escritas ≥ 30%
  // Só aplica se Inst. Escritas possui conteúdo cadastrado.
  if (written.hasContent && written.pct < NAVI_THRESHOLDS.UNLOCK_VIDEO) {
    locks[MODULE_IDS.videoInstructions] = {
      locked: true,
      reason: `Leia 30% das Instruções Escritas para liberar. (${Math.round(written.pct * 100)}% concluído)`,
      pct: written.pct,
    };
  }

  // Avaliações — SEM trava de progresso.
  // Gestor: acesso liberado independentemente do percentual de conteúdo consumido.
  // Colaborador: bloqueio global permanece em canUserAccessModule (access.service.js).
  // Admin: retorno {} acima — nenhum lock aplicado.

  // Requisições TI — bloqueada para TODOS os usuários (não-admin) da Retaguarda
  // até que 100% do conteúdo obrigatório ativo seja integralmente consumido.
  if (sectorId === SECTOR_IDS.backoffice && !allDone) {
    locks[MODULE_IDS.tiRequest] = {
      locked: true,
      reason: 'Conclua 100% de todo o conteúdo do setor para liberar Requisições.',
      pct: activePct,
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

/**
 * Fonte da verdade para o sequenciamento de itens na renderização.
 *
 * A flag `moduleUi.naviSequentialActive` é definida em content-module-selection.js,
 * porém nem toda transição de estado a propagava (o objeto `ui` era recriado a
 * partir de MODULE_UI_DEFAULTS na resposta de sucesso), reativando a trava para
 * Administradores. Esta função consulta o usuário autenticado diretamente,
 * garantindo isenção do Admin independentemente da propagação da flag.
 *
 * @param {object|null} moduleUi Estado de UI do módulo
 * @returns {boolean} true → sequenciamento de itens ativo
 */
export function isNaviSequentialActive(moduleUi) {
  // Admin: nenhuma trava de item, em qualquer módulo.
  if (isAdminUser(getAuthenticatedUser())) return false;
  return moduleUi?.naviSequentialActive !== false;
}
