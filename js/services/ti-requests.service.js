import { requestApi } from './api.service.js';

// ── Retaguarda (TI) ────────────────────────────────────────────────────────

export function criarChamadoTI(payload) {
  return requestApi('criar-chamado-ti', {
    solicitanteId:    String(payload.solicitanteId    || ''),
    solicitanteNome:  String(payload.solicitanteNome  || ''),
    solicitanteSetor: String(payload.solicitanteSetor || ''),
    unidade:          String(payload.unidade          || ''),
    categoria:        String(payload.categoria        || ''),
    descricao:        String(payload.descricao        || ''),
    destino:          'retaguarda',
  });
}

export async function listarChamadosTI(period = 'mes', destino = 'retaguarda') {
  const response = await requestApi('listar-chamados-ti', { period, destino });
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

// ── Motorista ──────────────────────────────────────────────────────────────

export function criarChamadoMotorista(payload) {
  return requestApi('criar-chamado-motorista', {
    solicitanteId:    String(payload.solicitanteId    || ''),
    solicitanteNome:  String(payload.solicitanteNome  || ''),
    solicitanteSetor: String(payload.solicitanteSetor || ''),
    unidade:          String(payload.unidade          || ''),
    tipoServico:      String(payload.tipoServico      || ''),
    cidade:           String(payload.cidade           || ''),
    bairro:           String(payload.bairro           || ''),
    endereco:         String(payload.endereco         || ''),
    descricao:        String(payload.descricao        || ''),
    destino:          'motorista',
  });
}

export async function listarChamadosMotorista(period = 'mes') {
  return listarChamadosTI(period, 'motorista');
}

// ── Normalização ───────────────────────────────────────────────────────────

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
    tipoServico:       t.tipo_servico      ?? t.tipoServico      ?? '',
    cidade:            t.cidade            ?? '',
    bairro:            t.bairro            ?? '',
    endereco:          t.endereco          ?? '',
    descricao:         t.descricao         ?? '',
    destino:           t.destino           ?? 'retaguarda',
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
