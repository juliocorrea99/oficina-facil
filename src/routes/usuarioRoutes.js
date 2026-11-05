const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { autenticar } = require('../middlewares/authMiddleware');

// Edição do próprio perfil (RF02)
router.put('/perfil', autenticar, usuarioController.atualizarPerfil);

module.exports = router;
