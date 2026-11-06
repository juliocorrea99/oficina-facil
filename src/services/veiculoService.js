const repository = require('../database/repositories/veiculoRepository');

function falha(mensagem, status = 400) {
  const erro = new Error(mensagem); erro.status = status; return erro;
}
function validar(dados = {}) {
  const placa = String(dados.placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const marca = String(dados.marca || '').trim();
  const modelo = String(dados.modelo || '').trim();
  const apelido = String(dados.apelido || '').trim() || null;
  const ano = (dados.ano === null || dados.ano === '' || dados.ano === undefined) ? null : Number(dados.ano);
  if (!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(placa)) throw falha('Placa inválida. Informe sete caracteres no formato brasileiro.');
  if (marca.length < 2 || marca.length > 80 || modelo.length < 2 || modelo.length > 100) {
    throw falha('Marca e modelo devem possuir entre 2 e seus respectivos limites de caracteres.');
  }
  if (ano !== null && (!Number.isInteger(ano) || ano < 1886 || ano > new Date().getFullYear() + 1)) {
    throw falha('Ano do veículo inválido.');
  }
  if (apelido && apelido.length > 80) throw falha('Apelido muito longo.');
  return { placa, marca, modelo, ano, apelido };
}
async function listar(usuarioId) { return repository.listarPorUsuario(usuarioId); }
async function criar(usuarioId, dados) {
  try { return await repository.criar(usuarioId, validar(dados)); }
  catch (erro) { if (erro.code === '23505') throw falha('Essa placa já está cadastrada na sua conta.', 409); throw erro; }
}
async function editar(usuarioId, id, dados) {
  try {
    const registro = await repository.atualizar(id, usuarioId, validar(dados));
    if (!registro) throw falha('Veículo ativo não encontrado nesta conta.', 404);
    return registro;
  } catch (erro) { if (erro.code === '23505') throw falha('Essa placa já está cadastrada na sua conta.', 409); throw erro; }
}
async function inativar(usuarioId, id) {
  const registro = await repository.inativar(id, usuarioId);
  if (!registro) throw falha('Veículo ativo não encontrado nesta conta.', 404);
  return registro;
}
module.exports = { validar, listar, criar, editar, inativar };
