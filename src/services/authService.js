const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const usuarioRepository = require('../database/repositories/usuarioRepository');
const clienteRepository = require('../database/repositories/clienteRepository');
const oficinaRepository = require('../database/repositories/oficinaRepository');
const {
  validarEmail,
  validarSenha,
  validarUf,
  validarCnpj,
  validarCpf,
  apenasDigitos
} = require('../utils/validators');

const BCRYPT_SALT_ROUNDS = 10;

function getJwtSecret() {
  return process.env.JWT_SECRET || 'oficina-facil-segredo-jwt-padrao-desenvolvimento';
}

function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || '24h';
}

/**
 * Gera um token JWT com as informações essenciais do usuário autenticado.
 */
function gerarToken(usuario, perfilExtra = {}) {
  const payload = {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
    ...perfilExtra
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: getJwtExpiresIn()
  });
}

/**
 * Valida e decodifica um token JWT.
 */
function verificarToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (error) {
    return null;
  }
}

/**
 * Hash seguro de senha usando bcryptjs.
 */
async function gerarHashSenha(senha) {
  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  return bcrypt.hash(senha, salt);
}

/**
 * Compara senha em texto com o hash armazenado.
 */
async function compararSenha(senha, hash) {
  return bcrypt.compare(senha, hash);
}

/**
 * Realiza o cadastro de um novo Cliente.
 * Regras: RN01 (Unicidade de e-mail), RNF05 (Senha com hash).
 */
async function cadastrarCliente(dados) {
  const erros = [];

  const nome = (dados.nome || '').trim();
  const email = (dados.email || '').trim().toLowerCase();
  const senha = dados.senha || '';
  const telefone = dados.telefone ? dados.telefone.trim() : null;
  const cpf = dados.cpf ? dados.cpf.trim() : null;

  if (!nome || nome.length < 2) {
    erros.push('Nome completo é obrigatório e deve ter pelo menos 2 caracteres.');
  }

  if (!validarEmail(email)) {
    erros.push('E-mail inválido.');
  }

  if (!validarSenha(senha)) {
    erros.push('A senha deve conter no mínimo 6 caracteres.');
  }

  if (cpf && !validarCpf(cpf)) {
    erros.push('CPF inválido.');
  }

  if (erros.length > 0) {
    const erro = new Error('Falha de validação nos dados do cliente.');
    erro.status = 400;
    erro.erros = erros;
    throw erro;
  }

  // RN01: Verificar se e-mail já existe
  const usuarioExistente = await usuarioRepository.buscarPorEmail(email);
  if (usuarioExistente) {
    const erro = new Error('Este e-mail já está cadastrado no sistema.');
    erro.status = 409;
    throw erro;
  }

  const senhaHash = await gerarHashSenha(senha);

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const usuario = await usuarioRepository.criarUsuario(
      { nome, email, senhaHash, perfil: 'cliente', telefone },
      client
    );

    const cliente = await clienteRepository.criarCliente(
      { usuarioId: usuario.id, cpf },
      client
    );

    await client.query('COMMIT');

    const token = gerarToken(usuario, { clienteId: cliente.id });

    return {
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        telefone: usuario.telefone,
        clienteId: cliente.id,
        cpf: cliente.cpf
      },
      token
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    if (client.release) client.release();
  }
}

/**
 * Realiza o cadastro de uma nova Oficina.
 * Regras: RN01 (Unicidade de e-mail), RNF05 (Senha com hash).
 */
async function cadastrarOficina(dados) {
  const erros = [];

  const nome = (dados.nome || '').trim();
  const email = (dados.email || '').trim().toLowerCase();
  const senha = dados.senha || '';
  const telefone = dados.telefone ? dados.telefone.trim() : null;
  const nomeFantasia = (dados.nomeFantasia || '').trim();
  const razaoSocial = dados.razaoSocial ? dados.razaoSocial.trim() : null;
  const cnpj = (dados.cnpj || '').trim();
  const cep = dados.cep ? dados.cep.trim() : null;
  const logradouro = dados.logradouro ? dados.logradouro.trim() : null;
  const numero = dados.numero ? dados.numero.trim() : null;
  const complemento = dados.complemento ? dados.complemento.trim() : null;
  const bairro = dados.bairro ? dados.bairro.trim() : null;
  const cidade = (dados.cidade || '').trim();
  const uf = (dados.uf || '').trim().toUpperCase();
  const descricao = dados.descricao ? dados.descricao.trim() : null;

  if (!nome || nome.length < 2) {
    erros.push('Nome do responsável é obrigatório.');
  }

  if (!validarEmail(email)) {
    erros.push('E-mail inválido.');
  }

  if (!validarSenha(senha)) {
    erros.push('A senha deve conter no mínimo 6 caracteres.');
  }

  if (!nomeFantasia) {
    erros.push('Nome fantasia da oficina é obrigatório.');
  }

  if (!validarCnpj(cnpj)) {
    erros.push('CNPJ inválido.');
  }

  if (!cidade) {
    erros.push('Cidade é obrigatória.');
  }

  if (!validarUf(uf)) {
    erros.push('UF inválida.');
  }

  if (erros.length > 0) {
    const erro = new Error('Falha de validação nos dados da oficina.');
    erro.status = 400;
    erro.erros = erros;
    throw erro;
  }

  // RN01: Verificar se e-mail já existe
  const usuarioExistente = await usuarioRepository.buscarPorEmail(email);
  if (usuarioExistente) {
    const erro = new Error('Este e-mail já está cadastrado no sistema.');
    erro.status = 409;
    throw erro;
  }

  // Verificar se CNPJ já existe
  const oficinaExistente = await oficinaRepository.buscarPorCnpj(cnpj);
  if (oficinaExistente) {
    const erro = new Error('Este CNPJ já está cadastrado para outra oficina.');
    erro.status = 409;
    throw erro;
  }

  const senhaHash = await gerarHashSenha(senha);

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const usuario = await usuarioRepository.criarUsuario(
      { nome, email, senhaHash, perfil: 'oficina', telefone },
      client
    );

    const oficina = await oficinaRepository.criarOficina(
      {
        usuarioId: usuario.id,
        nomeFantasia,
        razaoSocial,
        cnpj,
        telefone,
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        uf,
        descricao
      },
      client
    );

    await client.query('COMMIT');

    const token = gerarToken(usuario, { oficinaId: oficina.id });

    return {
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        telefone: usuario.telefone,
        oficinaId: oficina.id,
        nomeFantasia: oficina.nome_fantasia,
        cnpj: oficina.cnpj,
        cidade: oficina.cidade,
        uf: oficina.uf
      },
      token
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    if (client.release) client.release();
  }
}

/**
 * Autentica um usuário existente com e-mail e senha.
 */
async function autenticarUsuario(email, senha) {
  if (!email || !senha) {
    const erro = new Error('E-mail e senha são obrigatórios.');
    erro.status = 400;
    throw erro;
  }

  const usuario = await usuarioRepository.buscarPorEmail(email);
  if (!usuario || !usuario.ativo) {
    const erro = new Error('E-mail ou senha incorretos.');
    erro.status = 401;
    throw erro;
  }

  const senhaValida = await compararSenha(senha, usuario.senha_hash);
  if (!senhaValida) {
    const erro = new Error('E-mail ou senha incorretos.');
    erro.status = 401;
    throw erro;
  }

  let perfilExtra = {};
  if (usuario.perfil === 'cliente') {
    const cliente = await clienteRepository.buscarPorUsuarioId(usuario.id);
    if (cliente) {
      perfilExtra.clienteId = cliente.id;
      perfilExtra.cpf = cliente.cpf;
    }
  } else if (usuario.perfil === 'oficina') {
    const oficina = await oficinaRepository.buscarPorUsuarioId(usuario.id);
    if (oficina) {
      perfilExtra.oficinaId = oficina.id;
      perfilExtra.nomeFantasia = oficina.nome_fantasia;
      perfilExtra.cnpj = oficina.cnpj;
      perfilExtra.cidade = oficina.cidade;
      perfilExtra.uf = oficina.uf;
    }
  }

  const token = gerarToken(usuario, perfilExtra);

  return {
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      telefone: usuario.telefone,
      ...perfilExtra
    },
    token
  };
}

/**
 * Retorna os dados completos do usuário autenticado.
 */
async function obterPerfilUsuario(usuarioId) {
  const usuario = await usuarioRepository.buscarPorId(usuarioId);
  if (!usuario || !usuario.ativo) {
    const erro = new Error('Usuário não encontrado ou inativo.');
    erro.status = 404;
    throw erro;
  }

  let dadosEspecificos = null;
  if (usuario.perfil === 'cliente') {
    dadosEspecificos = await clienteRepository.buscarPorUsuarioId(usuario.id);
  } else if (usuario.perfil === 'oficina') {
    dadosEspecificos = await oficinaRepository.buscarPorUsuarioId(usuario.id);
  }

  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
    telefone: usuario.telefone,
    criadoEm: usuario.criado_em,
    perfilDetalhes: dadosEspecificos
  };
}

module.exports = {
  cadastrarCliente,
  cadastrarOficina,
  autenticarUsuario,
  obterPerfilUsuario,
  gerarToken,
  verificarToken,
  gerarHashSenha,
  compararSenha
};
