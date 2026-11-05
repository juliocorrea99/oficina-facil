const oficinaService = require('../services/oficinaService');

/**
 * Controller para pesquisa pública de oficinas (RF04).
 */
async function pesquisar(req, res) {
  try {
    const { cidade, uf, servico } = req.query;
    const oficinas = await oficinaService.pesquisarOficinas({ cidade, uf, servico });
    return res.status(200).json({
      sucesso: true,
      total: oficinas.length,
      oficinas
    });
  } catch (error) {
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao realizar pesquisa de oficinas.'
    });
  }
}

/**
 * Controller para consulta do perfil público da oficina (RF05).
 */
async function obterPerfilPublico(req, res) {
  try {
    const oficinaId = parseInt(req.params.id, 10);
    if (isNaN(oficinaId)) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Identificador de oficina inválido.'
      });
    }

    const oficina = await oficinaService.obterPerfilPublico(oficinaId);
    return res.status(200).json({
      sucesso: true,
      oficina
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      sucesso: false,
      mensagem: error.message || 'Erro ao consultar perfil público da oficina.'
    });
  }
}

/**
 * Gestão de Serviços (RF03)
 */
async function listarServicos(req, res) {
  try {
    const servicos = await oficinaService.listarServicos(req.usuario.id);
    return res.status(200).json({
      sucesso: true,
      servicos
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      sucesso: false,
      mensagem: error.message || 'Erro ao listar serviços.'
    });
  }
}

async function cadastrarServico(req, res) {
  try {
    const servico = await oficinaService.cadastrarServico(req.usuario.id, req.body);
    return res.status(201).json({
      sucesso: true,
      mensagem: 'Serviço cadastrado com sucesso!',
      servico
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      sucesso: false,
      mensagem: error.message || 'Erro ao cadastrar serviço.',
      erros: error.erros || []
    });
  }
}

async function atualizarServico(req, res) {
  try {
    const servicoId = parseInt(req.params.id, 10);
    const servico = await oficinaService.atualizarServico(req.usuario.id, servicoId, req.body);
    return res.status(200).json({
      sucesso: true,
      mensagem: 'Serviço atualizado com sucesso!',
      servico
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      sucesso: false,
      mensagem: error.message || 'Erro ao atualizar serviço.',
      erros: error.erros || []
    });
  }
}

async function alternarStatusServico(req, res) {
  try {
    const servicoId = parseInt(req.params.id, 10);
    const { ativo } = req.body;
    const servico = await oficinaService.alternarStatusServico(req.usuario.id, servicoId, ativo);
    return res.status(200).json({
      sucesso: true,
      mensagem: `Serviço ${servico.ativo ? 'ativado' : 'inativado'} com sucesso!`,
      servico
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      sucesso: false,
      mensagem: error.message || 'Erro ao alterar status do serviço.'
    });
  }
}

/**
 * Gestão de Horários (RF03)
 */
async function consultarHorarios(req, res) {
  try {
    const horarios = await oficinaService.consultarHorarios(req.usuario.id);
    return res.status(200).json({
      sucesso: true,
      horarios
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      sucesso: false,
      mensagem: error.message || 'Erro ao consultar horários de funcionamento.'
    });
  }
}

async function atualizarHorarios(req, res) {
  try {
    const horarios = await oficinaService.atualizarHorarios(req.usuario.id, req.body.horarios);
    return res.status(200).json({
      sucesso: true,
      mensagem: 'Horários de funcionamento atualizados com sucesso!',
      horarios
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      sucesso: false,
      mensagem: error.message || 'Erro ao atualizar horários de funcionamento.',
      erros: error.erros || []
    });
  }
}

/**
 * Gestão de Disponibilidade (RF03)
 */
async function listarDisponibilidades(req, res) {
  try {
    const disponibilidades = await oficinaService.listarDisponibilidades(req.usuario.id);
    return res.status(200).json({
      sucesso: true,
      disponibilidades
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      sucesso: false,
      mensagem: error.message || 'Erro ao listar disponibilidades.'
    });
  }
}

async function cadastrarDisponibilidade(req, res) {
  try {
    const disponibilidade = await oficinaService.cadastrarDisponibilidade(req.usuario.id, req.body);
    return res.status(201).json({
      sucesso: true,
      mensagem: 'Janela de disponibilidade cadastrada com sucesso!',
      disponibilidade
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      sucesso: false,
      mensagem: error.message || 'Erro ao cadastrar disponibilidade.',
      erros: error.erros || []
    });
  }
}

async function removerDisponibilidade(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    await oficinaService.removerDisponibilidade(req.usuario.id, id);
    return res.status(200).json({
      sucesso: true,
      mensagem: 'Janela de disponibilidade removida com sucesso.'
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      sucesso: false,
      mensagem: error.message || 'Erro ao remover disponibilidade.'
    });
  }
}

module.exports = {
  pesquisar,
  obterPerfilPublico,
  listarServicos,
  cadastrarServico,
  atualizarServico,
  alternarStatusServico,
  consultarHorarios,
  atualizarHorarios,
  listarDisponibilidades,
  cadastrarDisponibilidade,
  removerDisponibilidade
};
