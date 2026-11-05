const db = require('../db');

/**
 * Lista os horários de funcionamento configurados para uma oficina (0 a 6).
 */
async function listarPorOficinaId(oficinaId, client = null) {
  const sql = `
    SELECT id, oficina_id, dia_semana,
           TO_CHAR(horario_abertura, 'HH24:MI') AS horario_abertura,
           TO_CHAR(horario_fechamento, 'HH24:MI') AS horario_fechamento,
           fechado
    FROM horarios_funcionamento
    WHERE oficina_id = $1
    ORDER BY dia_semana ASC;
  `;
  const executor = client || db;
  const result = await executor.query(sql, [oficinaId]);
  return result.rows.map(row => ({
    id: row.id,
    oficinaId: row.oficina_id,
    diaSemana: row.dia_semana,
    horarioAbertura: row.horario_abertura,
    horarioFechamento: row.horario_fechamento,
    fechado: Boolean(row.fechado)
  }));
}

/**
 * Salva ou atualiza os horários de funcionamento de uma oficina (RF03).
 * @param {number} oficinaId
 * @param {Array<{ diaSemana: number, horarioAbertura?: string, horarioFechamento?: string, fechado: boolean }>} listaHorarios
 */
async function salvarHorarios(oficinaId, listaHorarios, client = null) {
  const executor = client || db;

  for (const item of listaHorarios) {
    const dia = parseInt(item.diaSemana, 10);
    const fechado = Boolean(item.fechado);
    const abertura = fechado ? null : (item.horarioAbertura || null);
    const fechamento = fechado ? null : (item.horarioFechamento || null);

    const sql = `
      INSERT INTO horarios_funcionamento (oficina_id, dia_semana, horario_abertura, horario_fechamento, fechado, atualizado_em)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (oficina_id, dia_semana)
      DO UPDATE SET
        horario_abertura = EXCLUDED.horario_abertura,
        horario_fechamento = EXCLUDED.horario_fechamento,
        fechado = EXCLUDED.fechado,
        atualizado_em = CURRENT_TIMESTAMP;
    `;
    await executor.query(sql, [oficinaId, dia, abertura, fechamento, fechado]);
  }

  return listarPorOficinaId(oficinaId, executor);
}

module.exports = {
  listarPorOficinaId,
  salvarHorarios
};
