import { requestApi } from './api.service.js';

export function criarChamadoTI(payload) {
  return requestApi('criar-chamado-ti', {
    solicitanteId:    String(payload.solicitanteId    || ''),
    solicitanteNome:  String(payload.solicitanteNome  || ''),
    solicitanteSetor: String(payload.solicitanteSetor || ''),
    unidade:          String(payload.unidade          || ''),
    categoria:        String(payload.categoria        || ''),
    descricao:        String(payload.descricao        || ''),
  });
}

export async function listarChamadosTI(period = 'mes') {
  const response = await requestApi('listar-chamados-ti', { period });

  if (!response?.success) return response;

  return {
    ...response,
    tickets:          Array.isArray(response.tickets)          ? response.tickets.map(normalizeTicket)          : [],
    completedTickets: Array.isArray(response.completedTickets) ? response.completedTickets.map(normalizeTicket) : [],
  };
}

export function atualizarStatusChamadoTI(ticketId, novoStatus, usuarioId, usuarioNome, observacao) {
  return requestApi('atualizar-chamado-ti', {
    ticketId:    String(ticketId    || ''),
    novoStatus:  String(novoStatus  || ''),
    usuarioId:   String(usuarioId   || ''),
    usuarioNome: String(usuarioNome || ''),
    observacao:  String(observacao  || ''),
  });
}

// Normaliza snake_case do Supabase → camelCase esperado pela view
function normalizeTicket(t) {
  if (!t) return t;
  return {
    id:                t.id,
    status:            t.status,
    timestamp:         t.timestamp,
    solicitanteId:     t.solicitante_id    ?? t.solicitanteId    ?? '',
    solicitanteNome:   t.solicitante_nome  ?? t.solicitanteNome  ?? '',
    solicitanteSetor:  t.solicitante_setor ?? t.solicitanteSetor ?? '',
    unidade:           t.unidade           ?? '',
    categoria:         t.categoria         ?? '',
    descricao:         t.descricao         ?? '',
    atribuidoParaId:   t.atribuido_para_id   ?? t.atribuidoParaId   ?? '',
    atribuidoParaNome: t.atribuido_para_nome ?? t.atribuidoParaNome ?? '',
    dataAtribuicao:    t.data_atribuicao   ?? t.dataAtribuicao   ?? null,
    dataInicio:        t.data_inicio       ?? t.dataInicio       ?? null,
    dataConclusao:     t.data_conclusao    ?? t.dataConclusao    ?? null,
    dataFim:           t.data_fim          ?? t.dataFim          ?? null,
    duracaoMinutos:    t.duracao_minutos   ?? t.duracaoMinutos   ?? null,
    observacao:        t.observacao        ?? '',
  };
}