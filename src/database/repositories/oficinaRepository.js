const db = require('../db');

/**
 * Cria os dados complementares de um perfil de oficina.
 * @param {object} dados
 * @param {object} [client] - Cliente de transação opcional
 */
async function criarOficina({
  usuarioId,
  nomeFantasia,
  razaoSocial = null,
  cnpj,
  telefone = null,
  cep = null,
  logradouro = null,
  numero = null,
  complemento = null,
  bairro = null,
  cidade,
  uf,
  descricao = null
}, client = null) {
  const sql = `
    INSERT INTO oficinas (
      usuario_id, nome_fantasia, razao_social, cnpj, telefone,
      cep, logradouro, numero, complemento, bairro, cidade, uf, descricao
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING id, usuario_id, nome_fantasia, razao_social, cnpj, telefone,
              cep, logradouro, numero, complemento, bairro, cidade, uf, descricao,
              criado_em, atualizado_em;
  `;
  const executor = client || db;
  const params = [
    usuarioId,
    nomeFantasia.trim(),
    razaoSocial ? razaoSocial.trim() : null,
    cnpj.trim(),
    telefone ? telefone.trim() : null,
    cep ? cep.trim() : null,
    logradouro ? logradouro.trim() : null,
    numero ? numero.trim() : null,
    complemento ? complemento.trim() : null,
    bairro ? bairro.trim() : null,
    cidade.trim(),
    uf.trim().toUpperCase(),
    descricao ? descricao.trim() : null
  ];
  const result = await executor.query(sql, params);
  return result.rows[0];
}

/**
 * Busca oficina pelo CNPJ.
 * @param {string} cnpj
 * @param {object} [client]
 */
async function buscarPorCnpj(cnpj, client = null) {
  const sql = `
    SELECT id, usuario_id, nome_fantasia, cnpj
    FROM oficinas
    WHERE cnpj = $1
    LIMIT 1;
  `;
  const executor = client || db;
  const result = await executor.query(sql, [cnpj.trim()]);
  return result.rows[0] || null;
}

/**
 * Busca oficina pelo usuario_id.
 * @param {number|string} usuarioId
 * @param {object} [client]
 */
async function buscarPorUsuarioId(usuarioId, client = null) {
  const sql = `
    SELECT id, usuario_id, nome_fantasia, razao_social, cnpj, telefone,
           cep, logradouro, numero, complemento, bairro, cidade, uf, descricao,
           criado_em, atualizado_em
    FROM oficinas
    WHERE usuario_id = $1
    LIMIT 1;
  `;
  const executor = client || db;
  const result = await executor.query(sql, [usuarioId]);
  return result.rows[0] || null;
}

module.exports = {
  criarOficina,
  buscarPorCnpj,
  buscarPorUsuarioId
};
