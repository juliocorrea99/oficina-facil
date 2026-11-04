const { verificarToken } = require('../services/authService');

/**
 * Middleware para autenticação via cookie HttpOnly ou header Authorization.
 */
function autenticar(req, res, next) {
  let token = null;

  // 1. Tenta recuperar o token do cookie seguro HttpOnly
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // 2. Permite fallback para o header Authorization (para ferramentas como Postman e testes)
  if (!token && req.headers.authorization) {
    const partes = req.headers.authorization.split(' ');
    if (partes.length === 2 && /^Bearer$/i.test(partes[0])) {
      token = partes[1];
    }
  }

  if (!token) {
    return res.status(401).json({
      sucesso: false,
      mensagem: 'Não autenticado. Faça login para continuar.'
    });
  }

  const payload = verificarToken(token);
  if (!payload) {
    return res.status(401).json({
      sucesso: false,
      mensagem: 'Sessão inválida ou expirada. Faça login novamente.'
    });
  }

  req.usuario = payload;
  next();
}

/**
 * Middleware para controle de acesso por perfil (RNF05).
 * @param  {...string} perfisPermitidos - Ex: 'cliente', 'oficina'
 */
function autorizarPerfil(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Usuário não autenticado.'
      });
    }

    if (!perfisPermitidos.includes(req.usuario.perfil)) {
      return res.status(403).json({
        sucesso: false,
        mensagem: `Acesso negado. Esta área é restrita a: ${perfisPermitidos.join(', ')}.`
      });
    }

    next();
  };
}

module.exports = {
  autenticar,
  autorizarPerfil
};
