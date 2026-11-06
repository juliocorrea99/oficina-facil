'use strict';
const service = require('../services/avaliacaoService');
function tratar(res,e) {
  // Mensagens de erro de validação são informativas; falhas técnicas não vazam detalhes.
  if (!e.status) console.error('[RF14] Falha ao consultar avaliações:', e.message);
  res.status(e.status || 500).json({sucesso:false,
    mensagem:e.status ? e.message : 'Não foi possível processar a avaliação. Tente novamente.'});
}
async function cadastrar(req,res) {
  try {
    const avaliacao = await service.cadastrar(req.usuario.id, req.body);
    res.status(201).json({sucesso:true,mensagem:'Avaliação enviada com sucesso.',avaliacao});
  } catch(e) {tratar(res,e);}
}
async function minhas(req,res) {
  try {res.json({sucesso:true,avaliacoes:await service.minhas(req.usuario.id)});}
  catch(e) {tratar(res,e);}
}
async function publicas(req,res) {
  try {res.json({sucesso:true,...await service.publicas(req.params.id)});}
  catch(e) {tratar(res,e);}
}
module.exports = {cadastrar,minhas,publicas};
