const router=require('express').Router();
const ctrl=require('../controllers/agendamentoController');
const {autenticar,autorizarPerfil}=require('../middlewares/authMiddleware');
// Consulta publica de horarios disponiveis; reserva exige autenticacao como cliente.
router.get('/horarios',ctrl.slots);
router.get('/me',autenticar,autorizarPerfil('cliente'),ctrl.meus);
router.get('/oficina',autenticar,autorizarPerfil('oficina'),ctrl.agenda);
router.post('/',autenticar,autorizarPerfil('cliente'),ctrl.criar);
router.put('/:id',autenticar,autorizarPerfil('cliente'),ctrl.reagendar);
router.patch('/:id/cancelar',autenticar,autorizarPerfil('cliente'),ctrl.cancelar);
module.exports=router;
