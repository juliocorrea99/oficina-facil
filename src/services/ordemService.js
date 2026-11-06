'use strict';
const db = require('../database/db');
const ERRO_PADRAO = 'Não foi possível concluir a operação.';
function erro(mensagem, status = 400) { const e = new Error(mensagem); e.status = status; return e; }
function idPositivo(valor, campo = 'Identificador') {
  const numero = Number(valor);
  if (!Number.isSafeInteger(numero) || numero <= 0) throw erro(`${campo} inválido.`);
  return numero;
}
function texto(valor, campo, maximo, obrigatorio = false) {
  if (valor != null && typeof valor !== 'string') throw erro(`${campo} deve ser texto.`);
  const conteudo = (valor || '').trim();
  if (conteudo.length > maximo || (obrigatorio && !conteudo)) throw erro(`${campo} inválido (máximo ${maximo} caracteres).`);
  return conteudo;
}
function centavos(valor, campo, maxInteiro = 999999) {
  const s = String(valor);
  if (!new RegExp(`^\\d{1,${String(maxInteiro).length}}(?:\\.\\d{1,2})?$`).test(s) || Number(s) > maxInteiro)
    throw erro(`${campo} inválido. Use número positivo com até duas casas decimais.`);
  const [inteiro, frac = ''] = s.split('.');
  return Number(inteiro) * 100 + Number(frac.padEnd(2, '0'));
}
function validarItens(itens) {
  if (!Array.isArray(itens) || itens.length < 1 || itens.length > 30)
    throw erro('Informe de 1 a 30 itens de orçamento.');
  let somaCentesimos = 0;
  const preparados = itens.map((item, i) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw erro(`Item ${i + 1} inválido.`);
    if (!['peca','servico','mao_de_obra'].includes(item.tipo)) throw erro(`Tipo do item ${i + 1} inválido.`);
    const descricao = texto(item.descricao, 'Descrição do item', 200, true);
    const quantidadeCent = centavos(item.quantidade, 'Quantidade', 999);
    const precoCent = centavos(item.valorUnitario, 'Valor unitário');
    if (!quantidadeCent) throw erro('A quantidade precisa ser maior que zero.');
    somaCentesimos += Math.round(quantidadeCent * precoCent / 100);
    if (somaCentesimos > 9999999999) throw erro('Total do orçamento excede o limite permitido.');
    return { tipo: item.tipo, descricao, quantidade: (quantidadeCent / 100).toFixed(2),
      valorUnitario: (precoCent / 100).toFixed(2) };
  });
  return preparados;
}
async function transacao(fn) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const valor = await fn(client);
    await client.query('COMMIT');
    return valor;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) { /* erro original prevalece */ }
    if (e.code === '23505') throw erro('Já existe ordem para este agendamento.', 409);
    if (e.code === '23503') throw erro('Agendamento ou usuário relacionado não encontrado.', 409);
    throw e;
  } finally { client.release(); }
}
async function bloquearOrdem(client, ordemId, usuarioId, perfil) {
  const resposta = await client.query(`SELECT os.*, a.oficina_id, a.cliente_id FROM ordens_servico os
    JOIN agendamentos a ON a.id = os.agendamento_id
    JOIN oficinas o ON o.id = a.oficina_id
    JOIN clientes c ON c.id = a.cliente_id
    WHERE os.id=$1 AND (($3='oficina' AND o.usuario_id=$2) OR ($3='cliente' AND c.usuario_id=$2))
    FOR UPDATE OF os`, [idPositivo(ordemId, 'Ordem'), usuarioId, perfil]);
  if (!resposta.rows[0]) throw erro('Ordem de serviço não encontrada nesta conta.', 404);
  return resposta.rows[0];
}
function exigirStatus(ordem, permitidos) {
  if (!permitidos.includes(ordem.status)) throw erro(`Operação não permitida na situação "${ordem.status}".`, 409);
}
async function evento(client, ordemId, usuarioId, acao, anterior, novo, versao) {
  await client.query(`INSERT INTO ordem_eventos
    (ordem_id, usuario_id, acao, status_anterior, status_novo, versao_orcamento)
    VALUES ($1,$2,$3,$4,$5,$6)`, [ordemId, usuarioId, acao, anterior, novo, versao]);
}
async function receber(usuarioId, agendamentoId) {
  const agId = idPositivo(agendamentoId, 'Agendamento');
  const id = await transacao(async client => {
    // O mesmo bloqueio do cancelamento do RF08 impede que ambos ocorram em paralelo.
    const ag = await client.query(`SELECT a.id, a.status, o.usuario_id AS "oficinaUsuarioId"
      FROM agendamentos a JOIN oficinas o ON o.id=a.oficina_id
      WHERE a.id=$1 AND o.usuario_id=$2 FOR UPDATE OF a`, [agId, usuarioId]);
    const registro = ag.rows[0];
    if (!registro) throw erro('Agendamento não encontrado nesta oficina.', 404);
    if (registro.status !== 'agendado') throw erro('Somente um agendamento ativo pode ser recebido.', 409);
    const ja = await client.query('SELECT id FROM ordens_servico WHERE agendamento_id=$1', [agId]);
    if (ja.rows[0]) throw erro('Esse agendamento já possui ordem de serviço.', 409);
    await client.query(`UPDATE agendamentos SET status='recebido', recebido_em=CURRENT_TIMESTAMP,
      atualizado_em=CURRENT_TIMESTAMP WHERE id=$1 AND status='agendado'`, [agId]);
    const nova = await client.query('INSERT INTO ordens_servico(agendamento_id) VALUES ($1) RETURNING id', [agId]);
    const ordemId = nova.rows[0].id;
    await evento(client, ordemId, usuarioId, 'recebido', null, 'recebido', 0);
    return ordemId;
  });
  return obter(id, usuarioId, 'oficina');
}
async function diagnosticar(usuarioId, ordemId, dados = {}) {
  const diagnostico = texto(dados.diagnostico, 'Diagnóstico', 5000, true);
  await transacao(async client => {
    const ordem = await bloquearOrdem(client, ordemId, usuarioId, 'oficina');
    exigirStatus(ordem, ['recebido', 'diagnostico']);
    await client.query(`UPDATE ordens_servico SET diagnostico=$2, status='diagnostico',
      atualizado_em=CURRENT_TIMESTAMP WHERE id=$1`, [ordem.id, diagnostico]);
    await evento(client, ordem.id, usuarioId, 'diagnostico', ordem.status, 'diagnostico', ordem.orcamento_versao);
  });
  return obter(ordemId, usuarioId, 'oficina');
}
async function salvarOrcamento(usuarioId, ordemId, dados = {}) {
  const itens = validarItens(dados.itens);
  await transacao(async client => {
    const ordem = await bloquearOrdem(client, ordemId, usuarioId, 'oficina');
    exigirStatus(ordem, ['diagnostico','orcamento','aguardando_aprovacao','em_manutencao']);
    if (!ordem.diagnostico || !String(ordem.diagnostico).trim()) throw erro('Registre o diagnóstico antes do orçamento.', 409);
    await client.query('DELETE FROM orcamento_itens WHERE ordem_id=$1', [ordem.id]);
    for (const item of itens) {
      await client.query(`INSERT INTO orcamento_itens(ordem_id,tipo,descricao,quantidade,valor_unitario)
        VALUES ($1,$2,$3,$4,$5)`, [ordem.id, item.tipo, item.descricao, item.quantidade, item.valorUnitario]);
    }
    const versao = Number(ordem.orcamento_versao) + 1;
    await client.query(`UPDATE ordens_servico SET status='orcamento', orcamento_versao=$2,
      versao_aprovada=NULL, decisao_orcamento=NULL, decisao_em=NULL, motivo_recusa=NULL,
      atualizado_em=CURRENT_TIMESTAMP WHERE id=$1`, [ordem.id, versao]);
    await evento(client, ordem.id, usuarioId, 'orcamento_alterado', ordem.status, 'orcamento', versao);
  });
  return obter(ordemId, usuarioId, 'oficina');
}
async function enviarOrcamento(usuarioId, ordemId) {
  await transacao(async client => {
    const ordem = await bloquearOrdem(client, ordemId, usuarioId, 'oficina');
    exigirStatus(ordem, ['orcamento']);
    if (ordem.decisao_orcamento === 'recusado') throw erro('Após a recusa, revise o orçamento antes de reenviar.', 409);
    if (Number(ordem.orcamento_versao) < 1) throw erro('Orçamento sem itens.', 409);
    const itens = await client.query('SELECT COUNT(*)::int AS total FROM orcamento_itens WHERE ordem_id=$1', [ordem.id]);
    if (Number(itens.rows[0].total) < 1) throw erro('Orçamento sem itens.', 409);
    await client.query(`UPDATE ordens_servico SET status='aguardando_aprovacao',
      decisao_orcamento=NULL, decisao_em=NULL, motivo_recusa=NULL,
      atualizado_em=CURRENT_TIMESTAMP WHERE id=$1`, [ordem.id]);
    await evento(client, ordem.id, usuarioId, 'orcamento_enviado', ordem.status, 'aguardando_aprovacao', ordem.orcamento_versao);
  });
  return obter(ordemId, usuarioId, 'oficina');
}
async function decidir(usuarioId, ordemId, dados = {}) {
  if (!['aprovado','recusado'].includes(dados.decisao)) throw erro('Escolha aprovar ou recusar o orçamento.');
  if (dados.encerrar !== undefined && typeof dados.encerrar !== 'boolean') throw erro('Opção de encerramento inválida.');
  if (dados.encerrar && dados.decisao !== 'recusado') throw erro('Apenas um orçamento recusado pode ser encerrado pelo cliente.');
  const motivo = texto(dados.motivo, 'Motivo', 500, false);
  await transacao(async client => {
    const ordem = await bloquearOrdem(client, ordemId, usuarioId, 'cliente');
    exigirStatus(ordem, ['aguardando_aprovacao']);
    if (ordem.decisao_orcamento === 'aprovado') throw erro('Orçamento já aprovado. Aguarde a oficina.', 409);
    const novoStatus = dados.encerrar ? 'cancelado' : dados.decisao === 'recusado' ? 'orcamento' : 'aguardando_aprovacao';
    await client.query(`UPDATE ordens_servico SET status=$2, decisao_orcamento=$3,
      versao_aprovada=$4, decisao_em=CURRENT_TIMESTAMP, motivo_recusa=$5,
      motivo_cancelamento=$6, encerrado_em=CASE WHEN $7::boolean THEN CURRENT_TIMESTAMP ELSE NULL END,
      atualizado_em=CURRENT_TIMESTAMP WHERE id=$1`,
    [ordem.id, novoStatus, dados.decisao, dados.decisao === 'aprovado' ? ordem.orcamento_versao : null,
      dados.decisao === 'recusado' ? motivo || null : null,
      dados.encerrar ? motivo || 'Orçamento recusado pelo cliente.' : null,
      dados.encerrar === true]);
    await evento(client, ordem.id, usuarioId, dados.encerrar ? 'recusado_encerrado' : dados.decisao,
      ordem.status, novoStatus, ordem.orcamento_versao);
  });
  return obter(ordemId, usuarioId, 'cliente');
}
async function encerrarAposRecusa(usuarioId, ordemId, dados = {}) {
  const motivo = texto(dados.motivo, 'Motivo de encerramento', 500, false);
  await transacao(async client => {
    const ordem = await bloquearOrdem(client, ordemId, usuarioId, 'cliente');
    if (ordem.status !== 'orcamento' || ordem.decisao_orcamento !== 'recusado')
      throw erro('O encerramento pelo cliente exige recusa prévia do orçamento.', 409);
    await client.query(`UPDATE ordens_servico SET status='cancelado',
      motivo_cancelamento=$2, encerrado_em=CURRENT_TIMESTAMP,
      atualizado_em=CURRENT_TIMESTAMP WHERE id=$1`, [ordem.id, motivo || 'Orçamento recusado pelo cliente.']);
    await evento(client, ordem.id, usuarioId, 'encerrado_cliente', ordem.status, 'cancelado', ordem.orcamento_versao);
  });
  return obter(ordemId, usuarioId, 'cliente');
}
async function avancar(usuarioId, ordemId, novoStatus) {
  const anteriorExigido = { em_manutencao:'aguardando_aprovacao', finalizado:'em_manutencao', entregue:'finalizado' };
  if (!Object.hasOwn(anteriorExigido, novoStatus)) throw erro('Próxima etapa inválida.');
  await transacao(async client => {
    const ordem = await bloquearOrdem(client, ordemId, usuarioId, 'oficina');
    exigirStatus(ordem, [anteriorExigido[novoStatus]]);
    if (novoStatus === 'em_manutencao' && (ordem.decisao_orcamento !== 'aprovado' ||
        Number(ordem.versao_aprovada) !== Number(ordem.orcamento_versao) || !ordem.versao_aprovada))
      throw erro('A manutenção exige aprovação do orçamento atual pelo cliente.', 409);
    await client.query(`UPDATE ordens_servico SET status=$2, atualizado_em=CURRENT_TIMESTAMP WHERE id=$1`,
      [ordem.id, novoStatus]);
    await evento(client, ordem.id, usuarioId, novoStatus, ordem.status, novoStatus, ordem.orcamento_versao);
  });
  return obter(ordemId, usuarioId, 'oficina');
}
async function cancelarOficina(usuarioId, ordemId, dados = {}) {
  const motivo = texto(dados.motivo, 'Motivo do cancelamento', 500, true);
  await transacao(async client => {
    const ordem = await bloquearOrdem(client, ordemId, usuarioId, 'oficina');
    if (['finalizado','entregue','cancelado'].includes(ordem.status)) throw erro('Não é possível cancelar uma ordem encerrada.',409);
    await client.query(`UPDATE ordens_servico SET status='cancelado', motivo_cancelamento=$2,
      encerrado_em=CURRENT_TIMESTAMP, atualizado_em=CURRENT_TIMESTAMP WHERE id=$1`, [ordem.id, motivo]);
    await evento(client, ordem.id, usuarioId, 'cancelado_oficina', ordem.status, 'cancelado', ordem.orcamento_versao);
  });
  return obter(ordemId, usuarioId, 'oficina');
}
async function obter(ordemId, usuarioId, perfil) {
  if (!['cliente','oficina'].includes(perfil)) throw erro('Perfil inválido.', 403);
  const r = await db.query(`SELECT os.id, os.agendamento_id AS "agendamentoId", os.status,
    os.diagnostico, os.orcamento_versao AS "orcamentoVersao", os.versao_aprovada AS "versaoAprovada",
    os.decisao_orcamento AS "decisaoOrcamento", os.decisao_em AS "decisaoEm",
    os.motivo_recusa AS "motivoRecusa", os.motivo_cancelamento AS "motivoCancelamento",
    os.criado_em AS "criadoEm", os.atualizado_em AS "atualizadoEm",
    a.status AS "statusAgendamento", TO_CHAR(a.data,'YYYY-MM-DD') AS data,
    TO_CHAR(a.horario_inicio,'HH24:MI') AS "horarioInicio",
    o.nome_fantasia AS "oficinaNome", u.nome AS "clienteNome", v.placa AS "veiculoPlaca",
    v.marca AS "veiculoMarca", v.modelo AS "veiculoModelo", s.nome AS "servicoNome"
    FROM ordens_servico os
    JOIN agendamentos a ON a.id=os.agendamento_id
    JOIN oficinas o ON o.id=a.oficina_id
    JOIN clientes c ON c.id=a.cliente_id
    JOIN usuarios u ON u.id=c.usuario_id
    JOIN veiculos v ON v.id=a.veiculo_id
    JOIN servicos s ON s.id=a.servico_id
    WHERE os.id=$1 AND (($3='oficina' AND o.usuario_id=$2) OR ($3='cliente' AND c.usuario_id=$2))`,
  [idPositivo(ordemId,'Ordem'), usuarioId, perfil]);
  const ordem = r.rows[0];
  if (!ordem) throw erro('Ordem de serviço não encontrada nesta conta.', 404);
  const itens = await db.query(`SELECT id, tipo, descricao, quantidade::float8 AS quantidade,
    valor_unitario::float8 AS "valorUnitario", (quantidade*valor_unitario)::float8 AS subtotal
    FROM orcamento_itens WHERE ordem_id=$1 ORDER BY id`, [ordem.id]);
  const lista = itens.rows;
  const total = lista.reduce((s,item) => s + Math.round(Number(item.subtotal)*100), 0) / 100;
  const maoDeObra = lista.filter(i=>i.tipo==='mao_de_obra').reduce((s,i)=>s+Math.round(Number(i.subtotal)*100),0)/100;
  return { ...ordem, itens: lista, total, maoDeObra };
}
async function listar(usuarioId, perfil) {
  if (!['cliente','oficina'].includes(perfil)) throw erro('Perfil inválido.',403);
  const r = await db.query(`SELECT os.id FROM ordens_servico os
    JOIN agendamentos a ON a.id=os.agendamento_id
    JOIN oficinas o ON o.id=a.oficina_id
    JOIN clientes c ON c.id=a.cliente_id
    WHERE (($2='oficina' AND o.usuario_id=$1) OR ($2='cliente' AND c.usuario_id=$1))
    ORDER BY os.atualizado_em DESC, os.id DESC LIMIT 200`, [usuarioId,perfil]);
  return Promise.all(r.rows.map(x=>obter(x.id, usuarioId, perfil)));
}
module.exports = { validarItens, idPositivo, receber, diagnosticar, salvarOrcamento,
  enviarOrcamento, decidir, encerrarAposRecusa, avancar, cancelarOficina, obter, listar, ERRO_PADRAO };
