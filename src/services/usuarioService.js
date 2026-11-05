const db = require('../database/db');
const usuarioRepository = require('../database/repositories/usuarioRepository');
const clienteRepository = require('../database/repositories/clienteRepository');
const oficinaRepository = require('../database/repositories/oficinaRepository');
const {
  validarEmail,
  validarUf,
  validarCpf
} = require('../utils/validators');

/**
 * Atualiza os dados do perfil do próprio usuário autenticado (RF02).
 * Garante RN01 (unicidade de e-mail) e isolamento entre perfis (RNF05).
 */
async function atualizarPerfil(usuarioId, dados) {
  const usuarioAtual = await usuarioRepository.buscarPorId(usuarioId);
  if (!usuarioAtual || !usuarioAtual.ativo) {
    const erro = new Error('Usuário não encontrado ou inativo.');
    erro.status = 404;
    throw erro;
  }

  const erros = [];
  const nome = (dados.nome || '').trim();
  const email = (dados.email || '').trim().toLowerCase();
  const telefone = dados.telefone ? dados.telefone.trim() : null;

  if (!nome || nome.length < 2) {
    erros.push('Nome é obrigatório e deve ter pelo menos 2 caracteres.');
  }

  if (!validarEmail(email)) {
    erros.push('E-mail informado é inválido.');
  }

  // RN01: Se o e-mail foi alterado, checar se já está em uso por outro usuário
  if (email !== usuarioAtual.email.toLowerCase()) {
    const usuarioComEmail = await usuarioRepository.buscarPorEmail(email);
    if (usuarioComEmail && usuarioComEmail.id !== usuarioAtual.id) {
      const erro = new Error('Este e-mail já está em uso por outra conta.');
      erro.status = 409;
      throw erro;
    }
  }

  const isCliente = usuarioAtual.perfil === 'cliente';
  const isOficina = usuarioAtual.perfil === 'oficina';

  let cpf = null;
  if (isCliente) {
    cpf = dados.cpf ? dados.cpf.trim() : null;
    if (cpf && !validarCpf(cpf)) {
      erros.push('CPF informado é inválido.');
    }
  }

  let dadosOficina = null;
  if (isOficina) {
    const nomeFantasia = (dados.nomeFantasia || '').trim();
    const cidade = (dados.cidade || '').trim();
    const uf = (dados.uf || '').trim().toUpperCase();

    if (!nomeFantasia) {
      erros.push('Nome Fantasia é obrigatório para oficina.');
    }
    if (!cidade) {
      erros.push('Cidade é obrigatória para oficina.');
    }
    if (!validarUf(uf)) {
      erros.push('UF informada é inválida.');
    }

    dadosOficina = {
      nomeFantasia,
      razaoSocial: dados.razaoSocial ? dados.razaoSocial.trim() : null,
      telefone: dados.telefone ? dados.telefone.trim() : null,
      cep: dados.cep ? dados.cep.trim() : null,
      logradouro: dados.logradouro ? dados.logradouro.trim() : null,
      numero: dados.numero ? dados.numero.trim() : null,
      complemento: dados.complemento ? dados.complemento.trim() : null,
      bairro: dados.bairro ? dados.bairro.trim() : null,
      cidade,
      uf,
      descricao: dados.descricao ? dados.descricao.trim() : null
    };
  }

  if (erros.length > 0) {
    const erro = new Error('Erro de validação nos dados do perfil.');
    erro.status = 400;
    erro.erros = erros;
    throw erro;
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const usuarioAtualizado = await usuarioRepository.atualizarUsuario(
      usuarioAtual.id,
      { nome, email, telefone },
      client
    );

    let perfilDetalhes = null;
    if (isCliente) {
      perfilDetalhes = await clienteRepository.atualizarCliente(
        usuarioAtual.id,
        { cpf },
        client
      );
    } else if (isOficina) {
      perfilDetalhes = await oficinaRepository.atualizarOficina(
        usuarioAtual.id,
        dadosOficina,
        client
      );
    }

    await client.query('COMMIT');

    return {
      id: usuarioAtualizado.id,
      nome: usuarioAtualizado.nome,
      email: usuarioAtualizado.email,
      perfil: usuarioAtualizado.perfil,
      telefone: usuarioAtualizado.telefone,
      atualizadoEm: usuarioAtualizado.atualizado_em,
      perfilDetalhes
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    if (client.release) client.release();
  }
}

module.exports = {
  atualizarPerfil
};
