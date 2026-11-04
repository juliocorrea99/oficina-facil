const db = require('../db');

/**
 * Busca usuário pelo endereço de e-mail (insensível a maiúsculas/minúsculas).
 * @param {string} email
 * @param {object} [client] - Cliente de transação opcional
 */
async function buscarPorEmail(email, client = null) {
  const sql = `
    SELECT id, nome, email, senha_hash, perfil, telefone, ativo, criado_em, atualizado_em
    FROM usuarios
    WHERE LOWER(email) = LOWER($1)
    LIMIT 1;
  `;
  const executor = client || db;
  const result = await executor.query(sql, [email.trim()]);
  return result.rows[0] || null;
}

/**
 * Busca usuário pelo ID (sem retornar senha_hash por segurança).
 * @param {number|string} id
 * @param {object} [client] - Cliente de transação opcional
 */
async function buscarPorId(id, client = null) {
  const sql = `
    SELECT id, nome, email, perfil, telefone, ativo, criado_em, atualizado_em
    FROM usuarios
    WHERE id = $1
    LIMIT 1;
  `;
  const executor = client || db;
  const result = await executor.query(sql, [id]);
  return result.rows[0] || null;
}

/**
 * Cria um novo registro de usuário no banco de dados.
 * @param {object} dados
 * @param {string} dados.nome
 * @param {string} dados.email
 * @param {string} dados.senhaHash
 * @param {string} dados.perfil - 'cliente' ou 'oficina'
 * @param {string} [dados.telefone]
 * @param {object} [client] - Cliente de transação opcional
 */
async function criarUsuario({ nome, email, senhaHash, perfil, telefone = null }, client = null) {
  const sql = `
    INSERT INTO usuarios (nome, email, senha_hash, perfil, telefone)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, nome, email, perfil, telefone, ativo, criado_em, atualizado_em;
  `;
  const executor = client || db;
  const params = [nome.trim(), email.trim().toLowerCase(), senhaHash, perfil, telefone];
  const result = await executor.query(sql, params);
  return result.rows[0];
}

module.exports = {
  buscarPorEmail,
  buscarPorId,
  criarUsuario
};
