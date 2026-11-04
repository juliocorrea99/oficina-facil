const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { autenticar, autorizarPerfil } = require('../middlewares/authMiddleware');

// Rotas públicas de cadastro e login (RF01)
router.post('/cadastro', authController.cadastrar);
router.post('/cadastro/cliente', authController.cadastrarCliente);
router.post('/cadastro/oficina', authController.cadastrarOficina);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// Rotas protegidas por autenticação
router.get('/me', autenticar, authController.me);

// Rotas para verificação de controle de acesso por perfil (RNF05)
router.get('/area-cliente', autenticar, autorizarPerfil('cliente'), authController.areaCliente);
router.get('/area-oficina', autenticar, autorizarPerfil('oficina'), authController.areaOficina);

module.exports = router;
