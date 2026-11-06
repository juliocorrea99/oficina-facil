const db = require('../db');

/**
 * Cria um novo período/janela de disponibilidade para a oficina (RF03).
 */
async function criarDisponibilidade({
  oficinaId,
  data,
  horarioInicio,
  horarioFim,
  vagasSimultaneas = 1
}, client = null) {
  const sql = `
    INSERT INTO disponibilidades (oficina_id, data, horario_inicio, horario_fim, vagas_simultaneas)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, oficina_id,
              TO_CHAR(data, 'YYYY-MM-DD') AS data,
              TO_CHAR(horario_inicio, 'HH24:MI') AS horario_inicio,
              TO_CHAR(horario_fim, 'HH24:MI') AS horario_fim,
              vagas_simultaneas, ativo, criado_em;
  `;
  const executor = client || db;
  const params = [
    oficinaId,
    data,
    horarioInicio,
    horarioFim,
    parseInt(vagasSimultaneas || 1, 10)
  ];
  const result = await executor.query(sql, params);
  const row = result.rows[0];
  return {
    id: row.id,
    oficinaId: row.oficina_id,
    data: row.data,
    horarioInicio: row.horario_inicio,
    horarioFim: row.horario_fim,
    vagasSimultaneas: row.vagas_simultaneas,
    ativo: row.ativo,
    criadoEm: row.criado_em
  };
}

/**
 * Busca disponibilidade por ID.
 */
async function buscarPorId(id, client = null) {
  const sql = `
    SELECT id, oficina_id,
           TO_CHAR(data, 'YYYY-MM-DD') AS data,
           TO_CHAR(horario_inicio, 'HH24:MI') AS horario_inicio,
           TO_CHAR(horario_fim, 'HH24:MI') AS horario_fim,
           vagas_simultaneas, ativo, criado_em
    FROM disponibilidades
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
    data: row.data,
    horarioInicio: row.horario_inicio,
    horarioFim: row.horario_fim,
    vagasSimultaneas: row.vagas_simultaneas,
    ativo: row.ativo,
    criadoEm: row.criado_em
  };
}

/**
 * Lista as disponibilidades de uma oficina ordenadas por data e horário de início.
 */
async function listarPorOficinaId(oficinaId, client = null) {
  const sql = `
    SELECT id, oficina_id,
           TO_CHAR(data, 'YYYY-MM-DD') AS data,
           TO_CHAR(horario_inicio, 'HH24:MI') AS horario_inicio,
           TO_CHAR(horario_fim, 'HH24:MI') AS horario_fim,
           vagas_simultaneas, ativo, criado_em
    FROM disponibilidades
    WHERE oficina_id = $1 AND ativo = true
    ORDER BY data ASC, horario_inicio ASC;
  `;
  const executor = client || db;
  const result = await executor.query(sql, [oficinaId]);
  return result.rows.map(row => ({
    id: row.id,
    oficinaId: row.oficina_id,
    data: row.data,
    horarioInicio: row.horario_inicio,
    horarioFim: row.horario_fim,
    vagasSimultaneas: row.vagas_simultaneas,
    ativo: row.ativo,
    criadoEm: row.criado_em
  }));
}

/**
 * Inativa logicamente uma janela sem quebrar agendamentos historicos (RN14).
 */
async function removerDisponibilidade(id, oficinaId, client = null) {
  const sql = `
    UPDATE disponibilidades SET ativo = false, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = $1 AND oficina_id = $2 AND ativo = true
    RETURNING id;
  `;
  const executor = client || db;
  const result = await executor.query(sql, [id, oficinaId]);
  return result.rowCount > 0;
}

module.exports = {
  criarDisponibilidade,
  buscarPorId,
  listarPorOficinaId,
  removerDisponibilidade
};
