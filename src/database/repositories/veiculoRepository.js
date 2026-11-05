const db = require('../db');

const campos = `v.id, v.cliente_id AS "clienteId", v.placa, v.marca, v.modelo, v.ano,
  v.apelido, v.ativo, v.criado_em AS "criadoEm", v.atualizado_em AS "atualizadoEm"`;

async function listarPorUsuario(usuarioId) {
  const resultado = await db.query(`SELECT ${campos} FROM veiculos v
    JOIN clientes c ON c.id = v.cliente_id
    WHERE c.usuario_id = $1 ORDER BY v.ativo DESC, v.id DESC`, [usuarioId]);
  return resultado.rows;
}

async function buscarDoUsuario(id, usuarioId, executor = db) {
  const resultado = await executor.query(`SELECT ${campos} FROM veiculos v
    JOIN clientes c ON c.id = v.cliente_id
    WHERE v.id = $1 AND c.usuario_id = $2 LIMIT 1`, [id, usuarioId]);
  return resultado.rows[0] || null;
}

async function criar(usuarioId, dados) {
  const resultado = await db.query(`INSERT INTO veiculos (cliente_id, placa, marca, modelo, ano, apelido)
    SELECT c.id, $2, $3, $4, $5, $6 FROM clientes c WHERE c.usuario_id = $1
    RETURNING id, cliente_id AS "clienteId", placa, marca, modelo, ano, apelido, ativo`,
  [usuarioId, dados.placa, dados.marca, dados.modelo, dados.ano, dados.apelido]);
  return resultado.rows[0] || null;
}

async function atualizar(id, usuarioId, dados) {
  const resultado = await db.query(`UPDATE veiculos v SET placa=$3, marca=$4, modelo=$5, ano=$6,
    apelido=$7, atualizado_em=CURRENT_TIMESTAMP
    FROM clientes c WHERE v.id=$1 AND v.cliente_id=c.id AND c.usuario_id=$2 AND v.ativo=true
    RETURNING v.id, v.cliente_id AS "clienteId", v.placa, v.marca, v.modelo,
      v.ano, v.apelido, v.ativo`,
  [id, usuarioId, dados.placa, dados.marca, dados.modelo, dados.ano, dados.apelido]);
  return resultado.rows[0] || null;
}

async function inativar(id, usuarioId) {
  const resultado = await db.query(`UPDATE veiculos v SET ativo=false, atualizado_em=CURRENT_TIMESTAMP
    FROM clientes c WHERE v.id=$1 AND v.cliente_id=c.id AND c.usuario_id=$2 AND v.ativo=true
    RETURNING v.id, v.ativo`, [id, usuarioId]);
  return resultado.rows[0] || null;
}
module.exports = { listarPorUsuario, buscarDoUsuario, criar, atualizar, inativar };
