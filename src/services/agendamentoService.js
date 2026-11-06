const db = require('../database/db');
const clienteRepo = require('../database/repositories/clienteRepository');
const oficinaRepo = require('../database/repositories/oficinaRepository');

function erro(mensagem, status=400) { const e = new Error(mensagem); e.status=status; return e; }
function inteiro(id, nome) { const n = Number(id); if (!Number.isSafeInteger(n) || n < 1) throw erro(`${nome} inválido.`); return n; }
function minutos(horario) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(horario || ''))) throw erro('Horário inválido. Use HH:MM.');
  const [h,m] = horario.split(':').map(Number);
  return h*60+m;
}
function hora(min) { return `${String(Math.floor(min / 60)).padStart(2,'0')}:${String(min % 60).padStart(2,'0')}`; }
function validarData(data) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data))) throw erro('Data inválida. Use AAAA-MM-DD.');
  const dia = new Date(`${data}T12:00:00Z`);
  if (Number.isNaN(dia.getTime()) || dia.toISOString().slice(0,10) !== data) throw erro('Data inexistente.');
  // Data/hora observadas no fuso local do servidor (configuracao do ambiente).
  const hoje = new Date();
  const hojeLocal = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`;
  if (data < hojeLocal) throw erro('Não é possível agendar em uma data passada.');
  return dia.getUTCDay();
}
function dadosReserva(dados={}) {
  const observacoes = String(dados.observacoes || '').trim();
  if (observacoes.length > 500) throw erro('Observações devem conter no máximo 500 caracteres.');
  const data = String(dados.data || '');
  const diaSemana = validarData(data);
  return {
    oficinaId: inteiro(dados.oficinaId,'Oficina'),
    veiculoId: inteiro(dados.veiculoId,'Veículo'),
    servicoId: inteiro(dados.servicoId,'Serviço'),
    disponibilidadeId: inteiro(dados.disponibilidadeId,'Janela de disponibilidade'),
    data, diaSemana, horarioInicio: String(dados.horarioInicio || ''),
    inicioMin: minutos(String(dados.horarioInicio || '')),
    observacoes: observacoes || null
  };
}
async function transacao(callback) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const resultado = await callback(client);
    await client.query('COMMIT');
    return resultado;
  } catch(e) {
    try { await client.query('ROLLBACK'); } catch (_) { /* preserva erro original */ }
    if (e.code === '23505' || e.code === '23P01') throw erro('Horário ou veículo já reservado. Selecione outra opção.',409);
    if (e.code === '23503') throw erro('Registro relacionado não encontrado.',409);
    throw e;
  } finally { client.release(); }
}
async function detalhesReserva(id, executor=db) {
  const r = await executor.query(`SELECT a.id, a.cliente_id AS "clienteId", a.oficina_id AS "oficinaId",
    a.veiculo_id AS "veiculoId", a.servico_id AS "servicoId", a.disponibilidade_id AS "disponibilidadeId",
    TO_CHAR(a.data,'YYYY-MM-DD') AS data,
    TO_CHAR(a.horario_inicio,'HH24:MI') AS "horarioInicio",
    TO_CHAR(a.horario_fim,'HH24:MI') AS "horarioFim",
    a.observacoes, a.status, a.motivo_cancelamento AS "motivoCancelamento",
    a.criado_em AS "criadoEm", a.atualizado_em AS "atualizadoEm",
    v.placa AS "veiculoPlaca", v.marca AS "veiculoMarca", v.modelo AS "veiculoModelo",
    s.nome AS "servicoNome", o.nome_fantasia AS "oficinaNome",
    u.nome AS "clienteNome", u.telefone AS "clienteTelefone"
    FROM agendamentos a
    JOIN veiculos v ON v.id=a.veiculo_id
    JOIN servicos s ON s.id=a.servico_id
    JOIN oficinas o ON o.id=a.oficina_id
    JOIN clientes c ON c.id=a.cliente_id
    JOIN usuarios u ON u.id=c.usuario_id
    WHERE a.id=$1`,[id]);
  return r.rows[0] || null;
}
async function prepararReserva(client, clienteId, d, ignorarId=0) {
  // A mesma ordem de bloqueio para operacoes concorrentes: veiculo -> oficina -> janela.
  const veiculo = await client.query(`SELECT id, cliente_id, ativo FROM veiculos
    WHERE id=$1 AND cliente_id=$2 AND ativo=true FOR UPDATE`,[d.veiculoId,clienteId]);
  if (!veiculo.rows[0]) throw erro('Veículo não pertence à sua conta ou está inativo.',403);
  const oficina = await client.query('SELECT id FROM oficinas WHERE id=$1 FOR UPDATE',[d.oficinaId]);
  if (!oficina.rows[0]) throw erro('Oficina não encontrada.',404);
  const janela = await client.query(`SELECT id, oficina_id, ativo, TO_CHAR(data,'YYYY-MM-DD') AS data,
    TO_CHAR(horario_inicio,'HH24:MI') AS "horarioInicio",
    TO_CHAR(horario_fim,'HH24:MI') AS "horarioFim", vagas_simultaneas AS vagas
    FROM disponibilidades WHERE id=$1 AND oficina_id=$2 AND ativo=true FOR UPDATE`,
  [d.disponibilidadeId,d.oficinaId]);
  const disp = janela.rows[0];
  if (!disp || disp.data !== d.data) throw erro('Janela de disponibilidade não encontrada para a data selecionada.',409);
  const servicoR = await client.query(`SELECT id, duracao_estimada_minutos AS duracao FROM servicos
    WHERE id=$1 AND oficina_id=$2 AND ativo=true`,[d.servicoId,d.oficinaId]);
  const servico = servicoR.rows[0];
  if (!servico) throw erro('Serviço indisponível nesta oficina.',409);
  const horarioR = await client.query(`SELECT fechado,
    TO_CHAR(horario_abertura,'HH24:MI') AS abertura,
    TO_CHAR(horario_fechamento,'HH24:MI') AS fechamento
    FROM horarios_funcionamento WHERE oficina_id=$1 AND dia_semana=$2`,[d.oficinaId,d.diaSemana]);
  const funcionamento = horarioR.rows[0];
  if (!funcionamento || funcionamento.fechado) throw erro('Oficina fechada nesta data.',409);
  const duracao = Number(servico.duracao);
  const fimMin = d.inicioMin + duracao;
  if (!Number.isSafeInteger(duracao) || duracao <= 0 || fimMin > 1440) throw erro('Duração do serviço inválida.',409);
  const iniJanela = minutos(disp.horarioInicio), fimJanela = minutos(disp.horarioFim);
  if (d.inicioMin < iniJanela || fimMin > fimJanela || (d.inicioMin-iniJanela)%30 !== 0) {
    throw erro('Horário fora da janela disponível.',409);
  }
  if (d.inicioMin < minutos(funcionamento.abertura) || fimMin > minutos(funcionamento.fechamento)) {
    throw erro('Horário fora do funcionamento da oficina.',409);
  }
  const agora = new Date();
  const hojeLocal = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
  if (d.data === hojeLocal && d.inicioMin <= agora.getHours() * 60 + agora.getMinutes()) {
    throw erro('Esse horário já passou. Selecione um horário futuro.', 409);
  }
  const fim = hora(fimMin);
  const veiculoConflito = await client.query(`SELECT COUNT(*)::int AS total FROM agendamentos
    WHERE veiculo_id=$1 AND data=$2 AND status IN ('agendado','recebido')
    AND horario_inicio < $4::time AND horario_fim > $3::time AND id <> $5`,
  [d.veiculoId,d.data,d.horarioInicio,fim,ignorarId]);
  if (Number(veiculoConflito.rows[0].total) > 0) throw erro('Veículo já possui agendamento neste período.',409);
  const ocupacao = await client.query(`SELECT COUNT(*)::int AS total FROM agendamentos
    WHERE oficina_id=$1 AND data=$2 AND status IN ('agendado','recebido')
    AND horario_inicio < $4::time AND horario_fim > $3::time AND id <> $5`,
  [d.oficinaId,d.data,d.horarioInicio,fim,ignorarId]);
  if (Number(ocupacao.rows[0].total) >= Number(disp.vagas)) throw erro('Não há vagas disponíveis para esse horário.',409);
  return fim;
}
async function obterClienteId(usuarioId) {
  const cliente = await clienteRepo.buscarPorUsuarioId(usuarioId);
  if (!cliente) throw erro('Perfil de cliente não encontrado.',404);
  return cliente.id;
}
async function criar(usuarioId,dados) {
  const d = dadosReserva(dados);
  const clienteId = await obterClienteId(usuarioId);
  const id = await transacao(async client => {
    const fim = await prepararReserva(client,clienteId,d);
    const resultado = await client.query(`INSERT INTO agendamentos
      (cliente_id, oficina_id, veiculo_id, servico_id, disponibilidade_id,
       data, horario_inicio, horario_fim, observacoes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [clienteId,d.oficinaId,d.veiculoId,d.servicoId,d.disponibilidadeId,d.data,d.horarioInicio,fim,d.observacoes]);
    const novoId=resultado.rows[0].id;
    await client.query(`INSERT INTO agendamento_eventos(agendamento_id,usuario_id,acao)
      VALUES ($1,$2,'criado')`,[novoId,usuarioId]);
    return novoId;
  });
  return detalhesReserva(id);
}
async function listarCliente(usuarioId) {
  const r=await db.query(`SELECT a.id FROM agendamentos a
    JOIN clientes c ON c.id=a.cliente_id WHERE c.usuario_id=$1
    ORDER BY a.data DESC, a.horario_inicio DESC LIMIT 200`,[usuarioId]);
  return Promise.all(r.rows.map(row => detalhesReserva(row.id)));
}
async function listarOficina(usuarioId,data) {
  const oficina=await oficinaRepo.buscarPorUsuarioId(usuarioId);
  if (!oficina) throw erro('Oficina não encontrada.',404);
  let sql=`SELECT id FROM agendamentos WHERE oficina_id=$1`;
  const params=[oficina.id];
  if(data) { validarDataFormato(data); sql+=' AND data=$2'; params.push(data); }
  sql+=' ORDER BY data ASC, horario_inicio ASC LIMIT 300';
  const r=await db.query(sql,params);
  return Promise.all(r.rows.map(row=>detalhesReserva(row.id)));
}
function validarDataFormato(data) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data))) throw erro('Data inválida. Use AAAA-MM-DD.');
  const dia=new Date(`${data}T12:00:00Z`);
  if(Number.isNaN(dia.getTime()) || dia.toISOString().slice(0,10)!==data) throw erro('Data inexistente.');
}
async function reagendar(usuarioId,id,dados) {
  const clienteId=await obterClienteId(usuarioId);
  const itemId=inteiro(id,'Agendamento');
  const novoId=await transacao(async client=>{
    const ag=await client.query(`SELECT id, cliente_id, oficina_id, status, observacoes,
      veiculo_id, servico_id FROM agendamentos WHERE id=$1 AND cliente_id=$2 FOR UPDATE`,[itemId,clienteId]);
    const atual=ag.rows[0];
    if(!atual) throw erro('Agendamento não encontrado nesta conta.',404);
    if(atual.status!=='agendado') throw erro('Agendamento recebido ou cancelado não pode ser alterado.',409);
    const d=dadosReserva({
      ...dados, oficinaId:atual.oficina_id,
      veiculoId:dados.veiculoId ?? atual.veiculo_id,
      servicoId:dados.servicoId ?? atual.servico_id,
      observacoes: dados.observacoes === undefined ? atual.observacoes : dados.observacoes
    });
    const fim=await prepararReserva(client,clienteId,d,itemId);
    await client.query(`UPDATE agendamentos SET veiculo_id=$2,servico_id=$3,disponibilidade_id=$4,
      data=$5,horario_inicio=$6,horario_fim=$7,observacoes=$8,atualizado_em=CURRENT_TIMESTAMP
      WHERE id=$1 AND cliente_id=$9 AND status='agendado'`,
    [itemId,d.veiculoId,d.servicoId,d.disponibilidadeId,d.data,d.horarioInicio,fim,d.observacoes,clienteId]);
    await client.query(`INSERT INTO agendamento_eventos(agendamento_id,usuario_id,acao)
      VALUES ($1,$2,'reagendado')`,[itemId,usuarioId]);
    return itemId;
  });
  return detalhesReserva(novoId);
}
async function cancelar(usuarioId,id,motivo) {
  const clienteId=await obterClienteId(usuarioId);
  const itemId=inteiro(id,'Agendamento');
  const justificativa=String(motivo || '').trim();
  if(justificativa.length>500) throw erro('Motivo muito longo.');
  await transacao(async client=>{
    const r=await client.query(`SELECT id,status FROM agendamentos WHERE id=$1 AND cliente_id=$2 FOR UPDATE`,[itemId,clienteId]);
    if(!r.rows[0]) throw erro('Agendamento não encontrado nesta conta.',404);
    if(r.rows[0].status!=='agendado') throw erro('Agendamento recebido ou cancelado não pode ser cancelado.',409);
    await client.query(`UPDATE agendamentos SET status='cancelado',motivo_cancelamento=$2,
      cancelado_em=CURRENT_TIMESTAMP,atualizado_em=CURRENT_TIMESTAMP WHERE id=$1`,[itemId,justificativa||null]);
    await client.query(`INSERT INTO agendamento_eventos(agendamento_id,usuario_id,acao)
      VALUES ($1,$2,'cancelado')`,[itemId,usuarioId]);
  });
  return detalhesReserva(itemId);
}
async function listarHorariosLivres(oficinaId,servicoId,data) {
  const oid=inteiro(oficinaId,'Oficina'), sid=inteiro(servicoId,'Serviço');
  const diaSemana=validarData(data);
  const [serv,func,disp,ag]=await Promise.all([
    db.query(`SELECT id,duracao_estimada_minutos AS duracao FROM servicos
      WHERE id=$1 AND oficina_id=$2 AND ativo=true`,[sid,oid]),
    db.query(`SELECT fechado,TO_CHAR(horario_abertura,'HH24:MI') AS abertura,
      TO_CHAR(horario_fechamento,'HH24:MI') AS fechamento
      FROM horarios_funcionamento WHERE oficina_id=$1 AND dia_semana=$2`,[oid,diaSemana]),
    db.query(`SELECT id,TO_CHAR(horario_inicio,'HH24:MI') AS "horarioInicio",
      TO_CHAR(horario_fim,'HH24:MI') AS "horarioFim",vagas_simultaneas AS vagas
      FROM disponibilidades WHERE oficina_id=$1 AND data=$2 AND ativo=true
      ORDER BY horario_inicio,id`,[oid,data]),
    db.query(`SELECT TO_CHAR(horario_inicio,'HH24:MI') AS inicio,
      TO_CHAR(horario_fim,'HH24:MI') AS fim FROM agendamentos
      WHERE oficina_id=$1 AND data=$2 AND status IN ('agendado','recebido')`,[oid,data])
  ]);
  if(!serv.rows[0]) throw erro('Serviço não disponível nesta oficina.',404);
  const h=func.rows[0];
  if(!h || h.fechado) return [];
  const duracao=Number(serv.rows[0].duracao), aberto=minutos(h.abertura), fechado=minutos(h.fechamento);
  const vagas=[];
  for (const janela of disp.rows) {
    const max=Number(janela.vagas);
    for(let ini=minutos(janela.horarioInicio); ini+duracao<=minutos(janela.horarioFim); ini+=30) {
      const fim=ini+duracao;
      if(ini<aberto || fim>fechado) continue;
      const ocupadas=ag.rows.filter(a=>minutos(a.inicio)<fim && minutos(a.fim)>ini).length;
      if(ocupadas<max) vagas.push({ disponibilidadeId:janela.id, data,
        horarioInicio:hora(ini), horarioFim:hora(fim), vagasRestantes:max-ocupadas });
    }
  }
  return vagas;
}
module.exports={ dadosReserva, validarData, listarHorariosLivres, criar, reagendar, cancelar, listarCliente, listarOficina };
