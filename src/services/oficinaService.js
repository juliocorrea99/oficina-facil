const oficinaRepository = require('../database/repositories/oficinaRepository');
const servicoRepository = require('../database/repositories/servicoRepository');
const horarioRepository = require('../database/repositories/horarioRepository');
const disponibilidadeRepository = require('../database/repositories/disponibilidadeRepository');

/**
 * Recupera o registro da oficina pertencente ao usuário logado (RN06).
 */
async function obterOficinaDoUsuario(usuarioId) {
  const oficina = await oficinaRepository.buscarPorUsuarioId(usuarioId);
  if (!oficina) {
    const erro = new Error('Oficina vinculada a este usuário não foi encontrada.');
    erro.status = 404;
    throw erro;
  }
  return oficina;
}

// ========================================================
// SERVIÇOS (RF03)
// ========================================================

async function cadastrarServico(usuarioId, dados) {
  const oficina = await obterOficinaDoUsuario(usuarioId);
  const erros = [];

  const nome = (dados.nome || '').trim();
  const duracao = parseInt(dados.duracaoEstimadaMinutos, 10);
  const preco = dados.precoEstimado !== undefined && dados.precoEstimado !== null && dados.precoEstimado !== ''
    ? parseFloat(dados.precoEstimado)
    : null;

  if (!nome || nome.length < 2) {
    erros.push('Nome do serviço é obrigatório e deve ter pelo menos 2 caracteres.');
  }

  if (isNaN(duracao) || duracao <= 0) {
    erros.push('Duração estimada em minutos deve ser um número inteiro positivo.');
  }

  if (preco !== null && (isNaN(preco) || preco < 0)) {
    erros.push('Preço estimado deve ser um valor numérico maior ou igual a zero.');
  }

  if (erros.length > 0) {
    const erro = new Error('Dados inválidos para o cadastro de serviço.');
    erro.status = 400;
    erro.erros = erros;
    throw erro;
  }

  return servicoRepository.criarServico({
    oficinaId: oficina.id,
    nome,
    descricao: dados.descricao,
    duracaoEstimadaMinutos: duracao,
    precoEstimado: preco
  });
}

async function listarServicos(usuarioId, apenasAtivos = false) {
  const oficina = await obterOficinaDoUsuario(usuarioId);
  return servicoRepository.listarPorOficinaId(oficina.id, apenasAtivos);
}

async function atualizarServico(usuarioId, servicoId, dados) {
  const oficina = await obterOficinaDoUsuario(usuarioId);

  const servicoExistente = await servicoRepository.buscarPorId(servicoId);
  if (!servicoExistente || servicoExistente.oficinaId !== oficina.id) {
    const erro = new Error('Serviço não encontrado ou não pertence a esta oficina.');
    erro.status = 404;
    throw erro;
  }

  const erros = [];
  const nome = (dados.nome || '').trim();
  const duracao = parseInt(dados.duracaoEstimadaMinutos, 10);
  const preco = dados.precoEstimado !== undefined && dados.precoEstimado !== null && dados.precoEstimado !== ''
    ? parseFloat(dados.precoEstimado)
    : null;

  if (!nome || nome.length < 2) {
    erros.push('Nome do serviço é obrigatório e deve ter pelo menos 2 caracteres.');
  }

  if (isNaN(duracao) || duracao <= 0) {
    erros.push('Duração estimada em minutos deve ser um número inteiro positivo.');
  }

  if (preco !== null && (isNaN(preco) || preco < 0)) {
    erros.push('Preço estimado deve ser um valor numérico maior ou igual a zero.');
  }

  if (erros.length > 0) {
    const erro = new Error('Dados inválidos para atualização do serviço.');
    erro.status = 400;
    erro.erros = erros;
    throw erro;
  }

  return servicoRepository.atualizarServico(servicoId, oficina.id, {
    nome,
    descricao: dados.descricao,
    duracaoEstimadaMinutos: duracao,
    precoEstimado: preco,
    ativo: dados.ativo !== undefined ? Boolean(dados.ativo) : servicoExistente.ativo
  });
}

async function alternarStatusServico(usuarioId, servicoId, ativo) {
  const oficina = await obterOficinaDoUsuario(usuarioId);
  const servico = await servicoRepository.buscarPorId(servicoId);
  if (!servico || servico.oficinaId !== oficina.id) {
    const erro = new Error('Serviço não encontrado ou não pertence a esta oficina.');
    erro.status = 404;
    throw erro;
  }

  return servicoRepository.alternarStatus(servicoId, oficina.id, ativo);
}

// ========================================================
// HORÁRIOS DE FUNCIONAMENTO (RF03)
// ========================================================

async function consultarHorarios(usuarioId) {
  const oficina = await obterOficinaDoUsuario(usuarioId);
  return horarioRepository.listarPorOficinaId(oficina.id);
}

async function atualizarHorarios(usuarioId, listaHorarios) {
  const oficina = await obterOficinaDoUsuario(usuarioId);

  if (!Array.isArray(listaHorarios)) {
    const erro = new Error('A lista de horários deve ser um array.');
    erro.status = 400;
    throw erro;
  }

  const erros = [];
  for (const item of listaHorarios) {
    const dia = parseInt(item.diaSemana, 10);
    if (isNaN(dia) || dia < 0 || dia > 6) {
      erros.push(`Dia da semana inválido: ${item.diaSemana}. Deve estar entre 0 (Domingo) e 6 (Sábado).`);
      continue;
    }

    if (!item.fechado) {
      if (!item.horarioAbertura || !item.horarioFechamento) {
        erros.push(`Dia ${dia}: Horário de abertura e fechamento são obrigatórios quando não fechado.`);
      } else if (item.horarioAbertura >= item.horarioFechamento) {
        erros.push(`Dia ${dia}: Horário de abertura (${item.horarioAbertura}) deve ser anterior ao de fechamento (${item.horarioFechamento}).`);
      }
    }
  }

  if (erros.length > 0) {
    const erro = new Error('Erro de validação nos horários de funcionamento.');
    erro.status = 400;
    erro.erros = erros;
    throw erro;
  }

  return horarioRepository.salvarHorarios(oficina.id, listaHorarios);
}

// ========================================================
// DISPONIBILIDADE NA AGENDA (RF03, RF05, RF07)
// ========================================================

async function listarDisponibilidades(usuarioId) {
  const oficina = await obterOficinaDoUsuario(usuarioId);
  return disponibilidadeRepository.listarPorOficinaId(oficina.id);
}

async function cadastrarDisponibilidade(usuarioId, dados) {
  const oficina = await obterOficinaDoUsuario(usuarioId);
  const erros = [];

  const data = (dados.data || '').trim();
  const horarioInicio = (dados.horarioInicio || '').trim();
  const horarioFim = (dados.horarioFim || '').trim();
  const vagas = parseInt(dados.vagasSimultaneas || 1, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    erros.push('Data inválida. Utilize o formato AAAA-MM-DD.');
  }

  if (!/^\d{2}:\d{2}$/.test(horarioInicio) || !/^\d{2}:\d{2}$/.test(horarioFim)) {
    erros.push('Horários de início e fim devem estar no formato HH:MM.');
  } else if (horarioInicio >= horarioFim) {
    erros.push(`Horário de início (${horarioInicio}) deve ser anterior ao horário de fim (${horarioFim}).`);
  }

  if (isNaN(vagas) || vagas < 1) {
    erros.push('Vagas simultâneas deve ser no mínimo 1.');
  }

  if (erros.length > 0) {
    const erro = new Error('Dados inválidos para o cadastro de disponibilidade.');
    erro.status = 400;
    erro.erros = erros;
    throw erro;
  }

  return disponibilidadeRepository.criarDisponibilidade({
    oficinaId: oficina.id,
    data,
    horarioInicio,
    horarioFim,
    vagasSimultaneas: vagas
  });
}

async function removerDisponibilidade(usuarioId, disponibilidadeId) {
  const oficina = await obterOficinaDoUsuario(usuarioId);
  const disp = await disponibilidadeRepository.buscarPorId(disponibilidadeId);
  if (!disp || disp.oficinaId !== oficina.id) {
    const erro = new Error('Janela de disponibilidade não encontrada ou não pertence a esta oficina.');
    erro.status = 404;
    throw erro;
  }

  return disponibilidadeRepository.removerDisponibilidade(disponibilidadeId, oficina.id);
}

// ========================================================
// PESQUISA PÚBLICA DE OFICINAS (RF04)
// ========================================================

async function pesquisarOficinas(filtros) {
  return oficinaRepository.pesquisarOficinas(filtros);
}

// ========================================================
// PERFIL PÚBLICO DA OFICINA (RF05)
// ========================================================

async function obterPerfilPublico(oficinaId) {
  const oficina = await oficinaRepository.buscarPorId(oficinaId);
  if (!oficina) {
    const erro = new Error('Oficina não encontrada.');
    erro.status = 404;
    throw erro;
  }

  const [servicos, horarios, disponibilidades] = await Promise.all([
    servicoRepository.listarPorOficinaId(oficina.id, true),
    horarioRepository.listarPorOficinaId(oficina.id),
    disponibilidadeRepository.listarPorOficinaId(oficina.id)
  ]);

  return {
    id: oficina.id,
    nomeFantasia: oficina.nome_fantasia,
    razaoSocial: oficina.razao_social,
    cnpj: oficina.cnpj,
    telefone: oficina.telefone,
    cep: oficina.cep,
    logradouro: oficina.logradouro,
    numero: oficina.numero,
    complemento: oficina.complemento,
    bairro: oficina.bairro,
    cidade: oficina.cidade,
    uf: oficina.uf,
    descricao: oficina.descricao,
    servicos,
    horarios,
    disponibilidades,
    avaliacoes: [] // Estado vazio informativo conforme especificação (RF14 pendente)
  };
}

module.exports = {
  obterOficinaDoUsuario,
  cadastrarServico,
  listarServicos,
  atualizarServico,
  alternarStatusServico,
  consultarHorarios,
  atualizarHorarios,
  listarDisponibilidades,
  cadastrarDisponibilidade,
  removerDisponibilidade,
  pesquisarOficinas,
  obterPerfilPublico
};
