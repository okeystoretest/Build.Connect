/**
 * ti-requests.view.kanban.admin.js
 * Controles gerenciais do Kanban de Motoristas (Gestor/Admin):
 *   • Barra de filtro por motorista
 *   • Painel de atribuição direta (coluna Pendente)
 *   • Botão de desatribuição (cards atribuídos)
 *
 * Extraído de ti-requests.view.kanban.js para respeitar o limite de 500 linhas
 * por módulo. Não contém lógica de estado — apenas geração de markup.
 */

import { sanitizeAttribute, sanitizeText } from '../../../utils/sanitize.js';

/**
 * Deriva a lista de motoristas para o filtro a partir dos chamados carregados,
 * combinada com a lista de usuários elegíveis vinda do backend. A união evita
 * que um motorista sem chamados no período desapareça do filtro.
 */
export function buildMotoristaFilterOptions(tickets, completedTickets, motoristasDisponiveis) {
  const map = new Map();

  [...(tickets || []), ...(completedTickets || [])].forEach((t) => {
    const id   = String(t.atribuidoParaId   || '').trim();
    const nome = String(t.atribuidoParaNome || '').trim();
    if (id && nome && !map.has(id)) map.set(id, nome);
  });

  (motoristasDisponiveis || []).forEach((u) => {
    const id   = String(u.id   || '').trim();
    const nome = String(u.nome || '').trim();
    if (id && nome && !map.has(id)) map.set(id, nome);
  });

  return [...map.entries()]
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
}

/**
 * Aplica o filtro de motorista às colunas do Kanban.
 * Chamados Pendentes não têm responsável, portanto são preservados: são
 * justamente os que o gestor precisa enxergar para realizar a atribuição.
 */
export function filterKanbanByMotorista(tickets, motoristaId, { keepUnassigned = false } = {}) {
  const id = String(motoristaId || '').trim();
  if (!id) return tickets || [];
  return (tickets || []).filter((t) => {
    const assignee = String(t.atribuidoParaId || '').trim();
    if (!assignee) return keepUnassigned;
    return assignee === id;
  });
}

/** Barra de filtro exibida acima do quadro, apenas para Gestor/Admin. */
export function renderKanbanFilterBar(motoristas, selectedId, totalVisible) {
  const options = motoristas.map((m) =>
    `<option value="${sanitizeAttribute(m.id)}"${m.id === selectedId ? ' selected' : ''}>${sanitizeText(m.nome)}</option>`
  ).join('');

  return `
    <div class="ti-kanban-toolbar">
      <div class="ti-kanban-toolbar-field">
        <label class="ti-kanban-toolbar-label" for="ti-kanban-motorista-filter">
          <i data-lucide="user-search"></i>
          <span>Filtrar por motorista</span>
        </label>
        <select
          id="ti-kanban-motorista-filter"
          class="ti-kanban-toolbar-select"
          data-ti-kanban-motorista
          aria-label="Filtrar atividades por motorista"
        >
          <option value="">Todos os motoristas</option>
          ${options}
        </select>
      </div>
      <div class="ti-kanban-toolbar-meta">
        <i data-lucide="layers"></i>
        <span>${totalVisible} atividade${totalVisible === 1 ? '' : 's'} em exibição</span>
      </div>
      ${selectedId ? `
        <button type="button" class="ti-kanban-toolbar-clear" data-ti-kanban-clear-filter>
          <i data-lucide="x"></i>
          <span>Limpar filtro</span>
        </button>` : ''}
    </div>
  `;
}

/**
 * Botão "Desatribuir" — exibido no detalhe de cards com responsável vinculado,
 * nas colunas Atribuído e Em andamento. Restrito a Gestor/Admin.
 */
export function renderUnassignButton(ticketId, isUpdating) {
  if (isUpdating) {
    return `<span class="ti-updating"><i data-lucide="loader-circle"></i> Atualizando…</span>`;
  }
  return `
    <button type="button" class="ti-kc-btn is-unassign"
      data-ti-unassign="${sanitizeAttribute(ticketId)}"
      title="Remover o vínculo e retornar o card para Pendente">
      <i data-lucide="user-minus"></i>Desatribuir
    </button>
  `;
}

/**
 * Painel de atribuição direta na coluna Pendente.
 * Fechado: botão "Atribuir a um motorista".
 * Aberto: select de motoristas elegíveis + confirmar/cancelar.
 */
export function renderAssignPanel(ticketId, motoristas, isOpen, isUpdating) {
  if (isUpdating) {
    return `<span class="ti-updating"><i data-lucide="loader-circle"></i> Atribuindo…</span>`;
  }

  if (!isOpen) {
    return `
      <button type="button" class="ti-kc-btn is-assign"
        data-ti-open-assign="${sanitizeAttribute(ticketId)}">
        <i data-lucide="user-plus"></i>Atribuir a um motorista
      </button>
    `;
  }

  if (!motoristas.length) {
    return `
      <div class="ti-inline-assign" data-ti-no-view>
        <p class="ti-inline-assign-empty">
          <i data-lucide="user-x"></i>
          Nenhum motorista elegível encontrado.
        </p>
        <button type="button" class="ti-kc-btn is-cancel" data-ti-cancel-assign>
          <i data-lucide="x"></i>Fechar
        </button>
      </div>
    `;
  }

  const options = motoristas.map((m) =>
    `<option value="${sanitizeAttribute(m.id)}">${sanitizeText(m.nome)}</option>`
  ).join('');

  return `
    <div class="ti-inline-assign" data-ti-no-view>
      <p class="ti-inline-assign-label">
        <i data-lucide="user-plus"></i>
        Selecione o motorista responsável:
      </p>
      <select class="ti-assign-select" data-ti-assign-select="${sanitizeAttribute(ticketId)}">
        <option value="">Selecione o motorista</option>
        ${options}
      </select>
      <p class="ti-assign-error" data-ti-assign-error style="display:none">
        Selecione um motorista antes de confirmar.
      </p>
      <div class="ti-inline-assign-btns">
        <button type="button" class="ti-kc-btn"
          data-ti-confirm-assign="${sanitizeAttribute(ticketId)}">
          <i data-lucide="check"></i>Confirmar atribuição
        </button>
        <button type="button" class="ti-kc-btn is-cancel" data-ti-cancel-assign>
          <i data-lucide="x"></i>Cancelar
        </button>
      </div>
    </div>
  `;
}
