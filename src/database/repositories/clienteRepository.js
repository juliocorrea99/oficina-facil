const db = require('../db');

/**
 * Cria os dados complementares de um perfil de cliente.
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

/**
 * Atualiza os dados específicos do cliente (RF02).
 */
async function atualizarCliente(usuarioId, { cpf = null }, client = null) {
  const sql = `
    UPDATE clientes
    SET cpf = $1, atualizado_em = CURRENT_TIMESTAMP
    WHERE usuario_id = $2
    RETURNING id, usuario_id, cpf, criado_em, atualizado_em;
  `;
  const executor = client || db;
  const params = [cpf ? cpf.trim() : null, usuarioId];
  const result = await executor.query(sql, params);
  return result.rows[0] || null;
}

module.exports = {
  criarCliente,
  buscarPorUsuarioId,
  atualizarCliente
};
