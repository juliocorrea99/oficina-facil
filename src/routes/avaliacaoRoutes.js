'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/avaliacaoController');
const {autenticar, autorizarPerfil} = require('../middlewares/authMiddleware');
router.post('/', autenticar, autorizarPerfil('cliente'), ctrl.cadastrar);
router.get('/minhas', autenticar, autorizarPerfil('cliente'), ctrl.minhas);
module.exports = router;
