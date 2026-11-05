const router = require('express').Router();
const controller = require('../controllers/veiculoController');
const { autenticar, autorizarPerfil } = require('../middlewares/authMiddleware');
router.use(autenticar, autorizarPerfil('cliente'));
router.get('/', controller.listar);
router.post('/', controller.criar);
router.put('/:id', controller.editar);
router.patch('/:id/inativar', controller.inativar);
module.exports=router;
