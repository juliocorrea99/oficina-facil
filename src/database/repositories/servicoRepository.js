const db = require('../db');

/**
 * Cria um novo serviço oferecido pela oficina (RF03).
 */
async function criarServico({
  oficinaId,
  nome,
  descricao = null,
  duracaoEstimadaMinutos,
  precoEstimado = null
}, client = null) {
  const sql = `
    INSERT INTO servicos (oficina_id, nome, descricao, duracao_estimada_minutos, preco_estimado)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, oficina_id, nome, descricao, duracao_estimada_minutos, preco_estimado, ativo, criado_em, atualizado_em;
  `;
  const executor = client || db;
  const params = [
    oficinaId,
    nome.trim(),
    descricao ? descricao.trim() : null,
    parseInt(duracaoEstimadaMinutos, 10),
    precoEstimado !== null && precoEstimado !== undefined && precoEstimado !== '' ? parseFloat(precoEstimado) : null
  ];
  const result = await executor.query(sql, params);
  const row = result.rows[0];
  return {
    id: row.id,
    oficinaId: row.oficina_id,
    nome: row.nome,
    descricao: row.descricao,
    duracaoEstimadaMinutos: row.duracao_estimada_minutos,
    precoEstimado: row.preco_estimado,
    ativo: row.ativo,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em
  };
}

/**
 * Busca serviço por ID.
 */
async function buscarPorId(id, client = null) {
  const sql = `
    SELECT id, oficina_id, nome, descricao, duracao_estimada_minutos, preco_estimado, ativo, criado_em, atualizado_em
    FROM servicos
    WHERE id = $1
    LIMIT 1;
  `;
  const executor = client || db;
  const result = await executor.query(sql, [id]);
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    oficinaId: row.oficina_id,
    nome: row.nome,
    descricao: row.descricao,
    duracaoEstimadaMinutos: row.duracao_estimada_minutos,
    precoEstimado: row.preco_estimado,
    ativo: row.ativo,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em
  };
}

/**
 * Lista serviços vinculados a uma oficina.
 * @param {number} oficinaId
 * @param {boolean} [apenasAtivos=false]
 */
async function listarPorOficinaId(oficinaId, apenasAtivos = false, client = null) {
  let sql = `
    SELECT id, oficina_id, nome, descricao, duracao_estimada_minutos, preco_estimado, ativo, criado_em, atualizado_em
    FROM servicos
    WHERE oficina_id = $1
  `;
  const params = [oficinaId];
  if (apenasAtivos) {
    sql += ` AND ativo = true`;
  }
  sql += ` ORDER BY nome ASC;`;

  const executor = client || db;
  const result = await executor.query(sql, params);
  return result.rows.map(row => ({
    id: row.id,
    oficinaId: row.oficina_id,
    nome: row.nome,
    descricao: row.descricao,
    duracaoEstimadaMinutos: row.duracao_estimada_minutos,
    precoEstimado: row.preco_estimado,
    ativo: row.ativo,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em
  }));
}

/**
 * Atualiza um serviço existente garantindo que pertença à oficina proprietária (RN06).
 */
async function atualizarServico(id, oficinaId, {
  nome,
  descricao = null,
  duracaoEstimadaMinutos,
  precoEstimado = null,
  ativo = true
}, client = null) {
  const sql = `
    UPDATE servicos
    SET nome = $1,
        descricao = $2,
        duracao_estimada_minutos = $3,
        preco_estimado = $4,
        ativo = $5,
        atualizado_em = CURRENT_TIMESTAMP
    WHERE id = $6 AND oficina_id = $7
    RETURNING id, oficina_id, nome, descricao, duracao_estimada_minutos, preco_estimado, ativo, criado_em, atualizado_em;
  `;
  const executor = client || db;
  const params = [
    nome.trim(),
    descricao ? descricao.trim() : null,
    parseInt(duracaoEstimadaMinutos, 10),
    precoEstimado !== null && precoEstimado !== undefined && precoEstimado !== '' ? parseFloat(precoEstimado) : null,
    Boolean(ativo),
    id,
    oficinaId
  ];
  const result = await executor.query(sql, params);
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    oficinaId: row.oficina_id,
    nome: row.nome,
    descricao: row.descricao,
    duracaoEstimadaMinutos: row.duracao_estimada_minutos,
    precoEstimado: row.preco_estimado,
    ativo: row.ativo,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em
  };
}

/**
 * Ativa ou inativa um serviço logicamente (RN14).
 */
async function alternarStatus(id, oficinaId, ativo, client = null) {
  const sql = `
    UPDATE servicos
    SET ativo = $1, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = $2 AND oficina_id = $3
    RETURNING id, oficina_id, nome, ativo, atualizado_em;
  `;
  const executor = client || db;
  const result = await executor.query(sql, [Boolean(ativo), id, oficinaId]);
  return result.rows[0] || null;
}

module.exports = {
  criarServico,
  buscarPorId,
  listarPorOficinaId,
  atualizarServico,
  alternarStatus
};
