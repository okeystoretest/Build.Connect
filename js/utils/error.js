/**
 * error.js — Tratamento centralizado de erros não-críticos.
 *
 * Substitui todos os catch(() => {}) silenciosos do projeto.
 * Garante rastreabilidade em produção sem interromper o fluxo do usuário.
 *
 * Uso:
 *   somePromise().catch(err => errorBoundary(err, 'contexto'));
 *   try { ... } catch (err) { errorBoundary(err, 'contexto'); }
 */

const PREFIX = '[BC]';

/**
 * Registra o erro no console e opcionalmente suprime a propagação.
 *
 * @param {unknown} err          - O erro capturado.
 * @param {string}  [context=''] - Identificador do contexto para facilitar o debug.
 * @param {{ silent?: boolean }} [options]
 *   silent: true  → apenas loga (padrão)
 *   silent: false → loga e re-lança (use quando o chamador quer propagar)
 */
export function errorBoundary(err, context = '', { silent = true } = {}) {
  const label = context ? `${PREFIX} [${context}]` : PREFIX;
  if (err instanceof Error) {
    console.warn(label, err.message, err);
  } else {
    console.warn(label, err);
  }
  if (!silent) throw err;
}
