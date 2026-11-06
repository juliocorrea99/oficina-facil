'use strict';
const service = require('../services/ordemService');
function tratar(res, e) {
  if (!e.status) console.error('[RF12] Falha interna na ordem:', { message: e.message, code: e.code, detail: e.detail, constraint: e.constraint });
  res.status(e.status || 500).json({sucesso:false,mensagem:e.status ? e.message : 'Erro ao processar a ordem de serviço.'});
}
function resposta(fn, status = 200, mensagem = 'Operação realizada com sucesso.') {
  return async (req, res) => {
    try { const ordem = await fn(req); res.status(status).json({sucesso:true,mensagem,ordem}); }
    catch (e) { tratar(res,e); }
  };
}
const listar = async (req,res) => {
  try { res.json({sucesso:true,ordens:await service.listar(req.usuario.id,req.usuario.perfil)}); }
  catch (e) { tratar(res,e); }
};
const obter = resposta(req=>service.obter(req.params.id,req.usuario.id,req.usuario.perfil));
const receber = resposta(req=>service.receber(req.usuario.id,req.body?.agendamentoId),201,'Veículo recebido e ordem de serviço criada.');
const diagnosticar = resposta(req=>service.diagnosticar(req.usuario.id,req.params.id,req.body),200,'Diagnóstico registrado.');
const orcamento = resposta(req=>service.salvarOrcamento(req.usuario.id,req.params.id,req.body),200,'Orçamento salvo. Envie-o ao cliente para aprovação.');
const enviar = resposta(req=>service.enviarOrcamento(req.usuario.id,req.params.id),200,'Orçamento enviado ao cliente.');
const decidir = resposta(req=>service.decidir(req.usuario.id,req.params.id,req.body),200,'Decisão registrada.');
const encerrar = resposta(req=>service.encerrarAposRecusa(req.usuario.id,req.params.id,req.body),200,'Atendimento encerrado.');
const avancar = resposta(req=>service.avancar(req.usuario.id,req.params.id,req.body?.status),200,'Etapa atualizada.');
const cancelar = resposta(req=>service.cancelarOficina(req.usuario.id,req.params.id,req.body),200,'Ordem cancelada.');
module.exports={listar,obter,receber,diagnosticar,orcamento,enviar,decidir,encerrar,avancar,cancelar};
