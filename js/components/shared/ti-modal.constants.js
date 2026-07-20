/**
 * ti-modal.constants.js
 * Constantes compartilhadas entre o modal de requisição da Retaguarda
 * (ti-modal.js) e o formulário da Central de Motoristas (ti-modal.motorista.js).
 *
 * Extraído para evitar duplicação após a divisão dos módulos.
 */

export const TI_UNITS = [
  'Unidade 1', 'Unidade 2', 'Unidade 3', 'Unidade 4',
  'Iguatemi', 'Centro Fashion', 'Showroom',
];

export const TI_CATEGORIES = [
  'Equipamentos',
  'Aplicativos',
  'Planilhas e Documentos',
  'Internet e Rede',
  'Sites e Sistemas Internos',
  'Acessos e Segurança',
  'Solicitações de Novos Recursos',
  'Desenvolvimento',
  'On-Boarding',
  'Off-Boarding',
];

export const MOTORISTA_TIPOS_SERVICO = [
  'Entrega',
  'Coleta',
  'Serviço',
  'Compra',
  'Transporte',
  'Manutenção do Veículo',
];

export const MAX_DESC = 2000;
