const express = require('express');
const router = express.Router();
const oficinaController = require('../controllers/oficinaController');
const avaliacaoController = require('../controllers/avaliacaoController');
const { autenticar, autorizarPerfil } = require('../middlewares/authMiddleware');

// Rotas de gestão da oficina autenticada (RF03)
// Devem ser registradas antes de /:id para evitar colisões de rotas
router.get('/me/servicos', autenticar, autorizarPerfil('oficina'), oficinaController.listarServicos);
router.post('/me/servicos', autenticar, autorizarPerfil('oficina'), oficinaController.cadastrarServico);
router.put('/me/servicos/:id', autenticar, autorizarPerfil('oficina'), oficinaController.atualizarServico);
router.patch('/me/servicos/:id/status', autenticar, autorizarPerfil('oficina'), oficinaController.alternarStatusServico);

router.get('/me/horarios', autenticar, autorizarPerfil('oficina'), oficinaController.consultarHorarios);
router.put('/me/horarios', autenticar, autorizarPerfil('oficina'), oficinaController.atualizarHorarios);

router.get('/me/disponibilidades', autenticar, autorizarPerfil('oficina'), oficinaController.listarDisponibilidades);
router.post('/me/disponibilidades', autenticar, autorizarPerfil('oficina'), oficinaController.cadastrarDisponibilidade);
router.delete('/me/disponibilidades/:id', autenticar, autorizarPerfil('oficina'), oficinaController.removerDisponibilidade);

// Rotas públicas (RF04 - Pesquisa de oficinas, RF05 - Perfil público)
router.get('/', oficinaController.pesquisar);
router.get('/:id/avaliacoes', avaliacaoController.publicas);
router.get('/:id', oficinaController.obterPerfilPublico);

module.exports = router;
