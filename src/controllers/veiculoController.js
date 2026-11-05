const service = require('../services/veiculoService');
function responderErro(res, erro) {
  return res.status(erro.status || (erro.code === '23503' ? 409 : 500)).json({
    sucesso: false, mensagem: erro.status ? erro.message : 'Não foi possível concluir a operação.'
  });
}
const idValido = id => Number.isSafeInteger(Number(id)) && Number(id) > 0;
async function listar(req,res) { try { res.json({ sucesso: true, veiculos: await service.listar(req.usuario.id) }); } catch(e) { responderErro(res,e); } }
async function criar(req,res) { try { const veiculo=await service.criar(req.usuario.id,req.body); res.status(201).json({ sucesso:true, veiculo }); } catch(e) { responderErro(res,e); } }
async function editar(req,res) { if (!idValido(req.params.id)) return res.status(400).json({ sucesso:false, mensagem:'ID inválido.' }); try { res.json({ sucesso:true,veiculo:await service.editar(req.usuario.id,Number(req.params.id),req.body) }); } catch(e) { responderErro(res,e); } }
async function inativar(req,res) { if (!idValido(req.params.id)) return res.status(400).json({ sucesso:false,mensagem:'ID inválido.' }); try { res.json({ sucesso:true,veiculo:await service.inativar(req.usuario.id,Number(req.params.id)) }); } catch(e) { responderErro(res,e); } }
module.exports={ listar,criar,editar,inativar };
