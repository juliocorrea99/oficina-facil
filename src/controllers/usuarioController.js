const usuarioService = require('../services/usuarioService');

/**
 * Controller para edição do próprio perfil (RF02).
 */
async function atualizarPerfil(req, res) {
  try {
    const usuarioAtualizado = await usuarioService.atualizarPerfil(req.usuario.id, req.body);
    return res.status(200).json({
      sucesso: true,
      mensagem: 'Perfil atualizado com sucesso!',
      usuario: usuarioAtualizado
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      sucesso: false,
      mensagem: error.message || 'Erro ao atualizar dados do perfil.',
      erros: error.erros || []
    });
  }
}

module.exports = {
  atualizarPerfil
};
