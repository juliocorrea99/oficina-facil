const authService = require('../services/authService');

function configurarCookieToken(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  });
}

/**
 * Controller para cadastro de cliente.
 */
async function cadastrarCliente(req, res) {
  try {
    const { usuario, token } = await authService.cadastrarCliente(req.body);
    configurarCookieToken(res, token);
    return res.status(201).json({
      sucesso: true,
      mensagem: 'Cadastro de cliente realizado com sucesso!',
      usuario,
      token
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      sucesso: false,
      mensagem: error.message || 'Erro ao realizar cadastro do cliente.',
      erros: error.erros || []
    });
  }
}

/**
 * Controller para cadastro de oficina.
 */
async function cadastrarOficina(req, res) {
  try {
    const { usuario, token } = await authService.cadastrarOficina(req.body);
    configurarCookieToken(res, token);
    return res.status(201).json({
      sucesso: true,
      mensagem: 'Cadastro de oficina realizado com sucesso!',
      usuario,
      token
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      sucesso: false,
      mensagem: error.message || 'Erro ao realizar cadastro da oficina.',
      erros: error.erros || []
    });
  }
}

/**
 * Controller unificado para cadastro que despacha com base no campo perfil.
 */
async function cadastrar(req, res) {
  const perfil = (req.body.perfil || '').toLowerCase();
  if (perfil === 'oficina') {
    return cadastrarOficina(req, res);
  }
  if (perfil === 'cliente') {
    return cadastrarCliente(req, res);
  }
  return res.status(400).json({
    sucesso: false,
    mensagem: 'Perfil inválido. Deve ser "cliente" ou "oficina".',
    erros: ['O campo perfil é obrigatório e deve ser "cliente" ou "oficina".']
  });
}

/**
 * Controller para autenticação de usuário (Login).
 */
async function login(req, res) {
  try {
    const { email, senha } = req.body;
    const { usuario, token } = await authService.autenticarUsuario(email, senha);
    configurarCookieToken(res, token);
    return res.status(200).json({
      sucesso: true,
      mensagem: 'Login realizado com sucesso!',
      usuario,
      token
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      sucesso: false,
      mensagem: error.message || 'Erro ao autenticar usuário.',
      erros: error.erros || []
    });
  }
}

/**
 * Controller para encerrar a sessão (Logout).
 */
async function logout(req, res) {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax'
  });
  return res.status(200).json({
    sucesso: true,
    mensagem: 'Logout realizado com sucesso.'
  });
}

/**
 * Controller para consultar os dados da sessão do usuário autenticado.
 */
async function me(req, res) {
  try {
    const perfil = await authService.obterPerfilUsuario(req.usuario.id);
    return res.status(200).json({
      sucesso: true,
      usuario: perfil
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      sucesso: false,
      mensagem: error.message || 'Erro ao consultar dados da sessão.'
    });
  }
}

/**
 * Controller de teste para verificar rota protegida exclusiva para clientes.
 */
async function areaCliente(req, res) {
  return res.status(200).json({
    sucesso: true,
    mensagem: `Bem-vindo à área do Cliente, ${req.usuario.nome}!`,
    usuario: req.usuario
  });
}

/**
 * Controller de teste para verificar rota protegida exclusiva para oficinas.
 */
async function areaOficina(req, res) {
  return res.status(200).json({
    sucesso: true,
    mensagem: `Bem-vindo à área da Oficina, ${req.usuario.nome}!`,
    usuario: req.usuario
  });
}

module.exports = {
  cadastrar,
  cadastrarCliente,
  cadastrarOficina,
  login,
  logout,
  me,
  areaCliente,
  areaOficina
};
