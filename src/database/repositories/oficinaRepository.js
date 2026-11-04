const db = require('../db');

/**
 * Cria os dados complementares de um perfil de oficina.
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

/**
 * Busca oficina pelo próprio ID da oficina (RF05).
 */
async function buscarPorId(id, client = null) {
  const sql = `
    SELECT id, usuario_id, nome_fantasia, razao_social, cnpj, telefone,
           cep, logradouro, numero, complemento, bairro, cidade, uf, descricao,
           criado_em, atualizado_em
    FROM oficinas
    WHERE id = $1
    LIMIT 1;
  `;
  const executor = client || db;
  const result = await executor.query(sql, [id]);
  return result.rows[0] || null;
}

/**
 * Atualiza os dados específicos da oficina (RF02).
 */
async function atualizarOficina(usuarioId, dados, client = null) {
  const sql = `
    UPDATE oficinas
    SET nome_fantasia = $1,
        razao_social = $2,
        telefone = $3,
        cep = $4,
        logradouro = $5,
        numero = $6,
        complemento = $7,
        bairro = $8,
        cidade = $9,
        uf = $10,
        descricao = $11,
        atualizado_em = CURRENT_TIMESTAMP
    WHERE usuario_id = $12
    RETURNING id, usuario_id, nome_fantasia, razao_social, cnpj, telefone,
              cep, logradouro, numero, complemento, bairro, cidade, uf, descricao,
              criado_em, atualizado_em;
  `;
  const executor = client || db;
  const params = [
    dados.nomeFantasia.trim(),
    dados.razaoSocial ? dados.razaoSocial.trim() : null,
    dados.telefone ? dados.telefone.trim() : null,
    dados.cep ? dados.cep.trim() : null,
    dados.logradouro ? dados.logradouro.trim() : null,
    dados.numero ? dados.numero.trim() : null,
    dados.complemento ? dados.complemento.trim() : null,
    dados.bairro ? dados.bairro.trim() : null,
    dados.cidade.trim(),
    dados.uf.trim().toUpperCase(),
    dados.descricao ? dados.descricao.trim() : null,
    usuarioId
  ];
  const result = await executor.query(sql, params);
  return result.rows[0] || null;
}

/**
 * Pesquisa oficinas reais com filtros por cidade, UF e tipo/nome de serviço (RF04).
 * Utiliza translate() para garantir busca insensível a maiúsculas e acentuação no PostgreSQL.
 */
async function pesquisarOficinas({ cidade = null, uf = null, servico = null }) {
  const condicoes = ['1=1'];
  const params = [];
  let paramIndex = 1;

  if (cidade && cidade.trim()) {
    condicoes.push(`translate(LOWER(o.cidade), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') LIKE translate(LOWER($${paramIndex}), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')`);
    params.push(`%${cidade.trim()}%`);
    paramIndex++;
  }

  if (uf && uf.trim()) {
    condicoes.push(`UPPER(o.uf) = UPPER($${paramIndex})`);
    params.push(uf.trim().toUpperCase());
    paramIndex++;
  }

  if (servico && servico.trim()) {
    condicoes.push(`EXISTS (
      SELECT 1 FROM servicos s
      WHERE s.oficina_id = o.id
        AND s.ativo = true
        AND translate(LOWER(s.nome), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') LIKE translate(LOWER($${paramIndex}), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')
    )`);
    params.push(`%${servico.trim()}%`);
    paramIndex++;
  }

  const sql = `
    SELECT o.id, o.nome_fantasia, o.razao_social, o.cidade, o.uf, o.bairro,
           o.telefone, o.descricao,
           COALESCE(
             (
               SELECT json_agg(s.nome ORDER BY s.nome)
               FROM servicos s
               WHERE s.oficina_id = o.id AND s.ativo = true
             ),
             '[]'::json
           ) AS servicos
    FROM oficinas o
    WHERE ${condicoes.join(' AND ')}
    ORDER BY o.nome_fantasia ASC;
  `;

  const result = await db.query(sql, params);
  return result.rows.map(row => ({
    id: row.id,
    nomeFantasia: row.nome_fantasia,
    razaoSocial: row.razao_social,
    cidade: row.cidade,
    uf: row.uf,
    bairro: row.bairro,
    telefone: row.telefone,
    descricao: row.descricao,
    servicos: Array.isArray(row.servicos) ? row.servicos : (typeof row.servicos === 'string' ? JSON.parse(row.servicos) : [])
  }));
}

module.exports = {
  criarOficina,
  buscarPorCnpj,
  buscarPorUsuarioId,
  buscarPorId,
  atualizarOficina,
  pesquisarOficinas
};
