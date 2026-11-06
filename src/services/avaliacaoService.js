'use strict';
const db = require('../database/db');

function erro(mensagem, status = 400) {
  const e = new Error(mensagem);
  e.status = status;
  return e;
}
function idPositivo(valor, nome = 'Identificador') {
  const id = Number(valor);
  if (!Number.isSafeInteger(id) || id <= 0) throw erro(`${nome} inválido.`);
  return id;
}
function validarAvaliacao(dados) {
  const nota = dados?.nota;
  if (!((typeof nota === 'number' && Number.isInteger(nota)) ||
    (typeof nota === 'string' && /^[1-5]$/.test(nota))) || Number(nota) < 1 || Number(nota) > 5)
    throw erro('Escolha uma nota de 1 a 5 estrelas.');
  if (typeof dados?.comentario !== 'string') throw erro('Informe um comentário sobre o atendimento.');
  const comentario = dados.comentario.trim();
  if (!comentario || comentario.length > 1000)
    throw erro('O comentário deve conter entre 1 e 1000 caracteres.');
  return { nota: Number(nota), comentario };
}
async function cadastrar(usuarioId, dados) {
  const ordemId = idPositivo(dados?.ordemId, 'Ordem de serviço');
  const {nota, comentario} = validarAvaliacao(dados);
  // Verificação de propriedade, sem expor ordens de outros clientes.
  const acesso = await db.query(`SELECT os.id, os.status FROM ordens_servico os
    JOIN agendamentos ag ON ag.id=os.agendamento_id
    JOIN clientes c ON c.id=ag.cliente_id
    WHERE os.id=$1 AND c.usuario_id=$2`, [ordemId, usuarioId]);
  if (!acesso.rows.length) throw erro('Ordem de serviço não encontrada nesta conta.', 404);
  if (!['finalizado','entregue'].includes(acesso.rows[0].status))
    throw erro('A avaliação só pode ser feita após a conclusão do atendimento.', 409);

  // A mesma verificação se repete no INSERT para não confiar somente na leitura anterior.
  // UNIQUE (ordem_id) impede avaliações duplicadas, inclusive em requisições simultâneas.
  const resultado = await db.query(`INSERT INTO avaliacoes (ordem_id, nota, comentario)
    SELECT os.id, $2::smallint, $3::varchar
    FROM ordens_servico os
    JOIN agendamentos ag ON ag.id=os.agendamento_id
    JOIN clientes c ON c.id=ag.cliente_id
    WHERE os.id=$1 AND c.usuario_id=$4 AND os.status IN ('finalizado','entregue')
    ON CONFLICT (ordem_id) DO NOTHING
    RETURNING id, ordem_id AS "ordemId", nota, comentario, criado_em AS "criadoEm"`,
  [ordemId, nota, comentario, usuarioId]);
  if (!resultado.rows.length)
    throw erro('Esta ordem já foi avaliada ou não está mais disponível para avaliação.', 409);
  return resultado.rows[0];
}
async function minhas(usuarioId) {
  const resultado = await db.query(`SELECT av.id, av.ordem_id AS "ordemId", av.nota,
    av.comentario, av.criado_em AS "criadoEm"
    FROM avaliacoes av
    JOIN ordens_servico os ON os.id=av.ordem_id
    JOIN agendamentos ag ON ag.id=os.agendamento_id
    JOIN clientes c ON c.id=ag.cliente_id
    WHERE c.usuario_id=$1 ORDER BY av.criado_em DESC, av.id DESC LIMIT 200`, [usuarioId]);
  return resultado.rows;
}
async function publicas(oficinaId) {
  const id = idPositivo(oficinaId, 'Oficina');
  const oficina = await db.query('SELECT id FROM oficinas WHERE id=$1', [id]);
  if (!oficina.rows.length) throw erro('Oficina não encontrada.', 404);
  // Nenhum dado pessoal (nome, CPF, telefone, e-mail) é retornado publicamente.
  const [resumo, lista] = await Promise.all([
    db.query(`SELECT COUNT(*)::int AS quantidade,
      COALESCE(ROUND(AVG(av.nota)::numeric, 1), 0)::float8 AS media
      FROM avaliacoes av
      JOIN ordens_servico os ON os.id=av.ordem_id
      JOIN agendamentos ag ON ag.id=os.agendamento_id
      WHERE ag.oficina_id=$1`, [id]),
    db.query(`SELECT av.id, av.nota, av.comentario, av.criado_em AS "criadoEm"
      FROM avaliacoes av
      JOIN ordens_servico os ON os.id=av.ordem_id
      JOIN agendamentos ag ON ag.id=os.agendamento_id
      WHERE ag.oficina_id=$1 ORDER BY av.criado_em DESC, av.id DESC LIMIT 30`, [id])
  ]);
  return {quantidade: Number(resumo.rows[0]?.quantidade || 0),
    media: Number(resumo.rows[0]?.media || 0), avaliacoes: lista.rows};
}
module.exports = {cadastrar, minhas, publicas, validarAvaliacao, idPositivo};
