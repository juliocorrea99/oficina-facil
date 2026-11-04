const db = require('../db');

/**
 * Cria os dados complementares de um perfil de cliente.
 * @param {object} dados
 * @param {number} dados.usuarioId
 * @param {string} [dados.cpf]
 * @param {object} [client] - Cliente de transação opcional
 */
async function criarCliente({ usuarioId, cpf = null }, client = null) {
  const sql = `
    INSERT INTO clientes (usuario_id, cpf)
    VALUES ($1, $2)
    RETURNING id, usuario_id, cpf, criado_em, atualizado_em;
  `;
  const executor = client || db;
  const params = [usuarioId, cpf ? cpf.trim() : null];
  const result = await executor.query(sql, params);
  return result.rows[0];
}

/**
 * Busca dados complementares do cliente pelo usuario_id.
 * @param {number|string} usuarioId
 * @param {object} [client]
 */
async function buscarPorUsuarioId(usuarioId, client = null) {
  const sql = `
    SELECT id, usuario_id, cpf, criado_em, atualizado_em
    FROM clientes
    WHERE usuario_id = $1
    LIMIT 1;
  `;
  const executor = client || db;
  const result = await executor.query(sql, [usuarioId]);
  return result.rows[0] || null;
}

module.exports = {
  criarCliente,
  buscarPorUsuarioId
};
