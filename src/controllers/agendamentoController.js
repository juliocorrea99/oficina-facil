const service=require('../services/agendamentoService');
function falha(res,e) {
  return res.status(e.status || 500).json({sucesso:false,mensagem:e.status?e.message:'Erro ao consultar ou atualizar a agenda.'});
}
async function slots(req,res) { try { res.json({sucesso:true,horarios:await service.listarHorariosLivres(req.query.oficinaId,req.query.servicoId,req.query.data)}); }catch(e){falha(res,e);} }
async function criar(req,res) { try { res.status(201).json({sucesso:true,mensagem:'Agendamento confirmado.',agendamento:await service.criar(req.usuario.id,req.body)}); }catch(e){falha(res,e);} }
async function meus(req,res) { try { res.json({sucesso:true,agendamentos:await service.listarCliente(req.usuario.id)}); }catch(e){falha(res,e);} }
async function agenda(req,res) { try { res.json({sucesso:true,agendamentos:await service.listarOficina(req.usuario.id,req.query.data)}); }catch(e){falha(res,e);} }
async function reagendar(req,res) { try { res.json({sucesso:true,mensagem:'Agendamento atualizado.',agendamento:await service.reagendar(req.usuario.id,req.params.id,req.body)}); }catch(e){falha(res,e);} }
async function cancelar(req,res) { try { res.json({sucesso:true,mensagem:'Agendamento cancelado.',agendamento:await service.cancelar(req.usuario.id,req.params.id,req.body?.motivo)}); }catch(e){falha(res,e);} }
module.exports={ slots,criar,meus,agenda,reagendar,cancelar };
