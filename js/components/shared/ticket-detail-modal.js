import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';
import { animateOut } from '../../utils/motion.js';
import { SETOR_LABELS } from '../../constants/sector.constants.js';

const STATUS_CFG = {
  'Pendente':     { color: '#F59E0B', icon: 'clock',        bg: 'rgba(245,158,11,0.12)'  },
  'Atribuído':    { color: '#8B5CF6', icon: 'user-check',   bg: 'rgba(139,92,246,0.12)'  },
  'Em andamento': { color: '#3B82F6', icon: 'loader-circle',bg: 'rgba(59,130,246,0.12)'  },
  'Concluído':    { color: '#10B981', icon: 'circle-check', bg: 'rgba(16,185,129,0.12)'  },
};

let activeModal = null;
let activeEscHandler = null;

export function openTicketDetailModal(ticket) {
  closeTicketDetailModal();

  const cfg   = STATUS_CFG[ticket.status] || STATUS_CFG['Pendente'];
  const setor = SETOR_LABELS[ticket.solicitanteSetor] || ticket.solicitanteSetor || '';

  const backdrop = document.createElement('div');
  backdrop.className = 'video-modal-backdrop ticket-detail-backdrop';
  backdrop.innerHTML = `
    <div class="ticket-detail-modal" role="dialog" aria-modal="true" aria-label="Detalhes do chamado">

      <!-- Header -->
      <div class="tdm-header">
        <div class="tdm-header-left">
          <span class="tdm-id">${sanitizeText(ticket.id || '—')}</span>
          <span class="tdm-status" style="color:${cfg.color};background:${cfg.bg}">
            <i data-lucide="${sanitizeAttribute(cfg.icon)}"></i>
            ${sanitizeText(ticket.status || '—')}
          </span>
        </div>
        <button type="button" class="video-modal-close tdm-close" aria-label="Fechar" data-tdm-close>
          <i data-lucide="x"></i>
        </button>
      </div>

      <!-- Categoria -->
      <div class="tdm-section tdm-cat-section">
        <i data-lucide="tag" style="color:${cfg.color}"></i>
        <div>
          <span class="tdm-field-label">Categoria</span>
          <span class="tdm-field-value tdm-cat-value">${sanitizeText(ticket.categoria || '—')}</span>
        </div>
      </div>

      <!-- Descrição -->
      ${ticket.descricao ? `
      <div class="tdm-section tdm-desc-section">
        <i data-lucide="align-left"></i>
        <div>
          <span class="tdm-field-label">Descrição</span>
          <p class="tdm-desc-text">${sanitizeText(ticket.descricao)}</p>
        </div>
      </div>
      ` : ''}

      <!-- Grid de campos -->
      <div class="tdm-fields-grid">

        <div class="tdm-field">
          <span class="tdm-field-label"><i data-lucide="user"></i> Solicitante</span>
          <span class="tdm-field-value">${sanitizeText(ticket.solicitanteNome || '—')}</span>
          ${setor ? `<span class="tdm-field-sub">${sanitizeText(setor)}</span>` : ''}
        </div>

        <div class="tdm-field">
          <span class="tdm-field-label"><i data-lucide="building-2"></i> Unidade</span>
          <span class="tdm-field-value">${sanitizeText(ticket.unidade || '—')}</span>
        </div>

        ${ticket.atribuidoParaNome ? `
        <div class="tdm-field">
          <span class="tdm-field-label"><i data-lucide="user-check"></i> Responsável</span>
          <span class="tdm-field-value">${sanitizeText(ticket.atribuidoParaNome)}</span>
        </div>
        ` : ''}

        <div class="tdm-field">
          <span class="tdm-field-label"><i data-lucide="calendar"></i> Aberto em</span>
          <span class="tdm-field-value">${fmtDateTime(ticket.timestamp)}</span>
        </div>

        ${ticket.dataAtribuicao ? `
        <div class="tdm-field">
          <span class="tdm-field-label"><i data-lucide="user-check"></i> Atribuído em</span>
          <span class="tdm-field-value">${fmtDateTime(ticket.dataAtribuicao)}</span>
        </div>
        ` : ''}

        ${ticket.dataInicio ? `
        <div class="tdm-field">
          <span class="tdm-field-label"><i data-lucide="play"></i> Iniciado em</span>
          <span class="tdm-field-value">${fmtDateTime(ticket.dataInicio)}</span>
        </div>
        ` : ''}

        ${ticket.dataConclusao || ticket.dataFim ? `
        <div class="tdm-field">
          <span class="tdm-field-label"><i data-lucide="check-circle"></i> Concluído em</span>
          <span class="tdm-field-value">${fmtDateTime(ticket.dataConclusao || ticket.dataFim)}</span>
        </div>
        ` : ''}

        ${ticket.duracaoMinutos ? `
        <div class="tdm-field">
          <span class="tdm-field-label"><i data-lucide="timer"></i> Duração</span>
          <span class="tdm-field-value">${fmtDuration(ticket.duracaoMinutos)}</span>
        </div>
        ` : ''}

      </div>

      <!-- Observação -->
      ${ticket.observacao ? `
      <div class="tdm-section tdm-obs-section">
        <i data-lucide="message-square"></i>
        <div>
          <span class="tdm-field-label">Observação de conclusão</span>
          <p class="tdm-desc-text">${sanitizeText(ticket.observacao)}</p>
        </div>
      </div>
      ` : ''}

    </div>
  `;

  backdrop.querySelector('[data-tdm-close]').addEventListener('click', closeTicketDetailModal);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeTicketDetailModal(); });

  activeEscHandler = (e) => { if (e.key === 'Escape') closeTicketDetailModal(); };
  document.addEventListener('keydown', activeEscHandler);

  document.body.appendChild(backdrop);
  document.body.classList.add('has-video-modal');
  activeModal = backdrop;

  if (window.lucide) lucide.createIcons({ root: backdrop });
}

export function closeTicketDetailModal() {
  if (activeEscHandler) document.removeEventListener('keydown', activeEscHandler);
  activeEscHandler = null;
  if (!activeModal) return;
  const target = activeModal;
  activeModal = null;
  animateOut(target, 'is-closing', 200, () => {
    target.remove();
    document.body.classList.remove('has-video-modal');
  });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
}

function fmtDuration(mins) {
  if (!mins || isNaN(mins)) return '—';
  const m = parseInt(mins, 10);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r > 0 ? `${h}h ${r}min` : `${h}h`;
}