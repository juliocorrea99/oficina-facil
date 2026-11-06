const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validarEmail,
  validarSenha,
  validarUf,
  validarCnpj,
  validarCpf,
  apenasDigitos
} = require('../src/utils/validators');

test('validarEmail - aceita e-mails válidos', () => {
  assert.equal(validarEmail('cliente@exemplo.com'), true);
  assert.equal(validarEmail('oficina.silva@auto.com.br'), true);
  assert.equal(validarEmail('user+teste@dominio.org'), true);
});

test('validarEmail - rejeita e-mails inválidos', () => {
  assert.equal(validarEmail(''), false);
  assert.equal(validarEmail(null), false);
  assert.equal(validarEmail('email-sem-arroba.com'), false);
  assert.equal(validarEmail('email@sem-ponto'), false);
  assert.equal(validarEmail('@sem-usuario.com'), false);
});

test('validarSenha - aceita senhas com 6 ou mais caracteres', () => {
  assert.equal(validarSenha('123456'), true);
  assert.equal(validarSenha('senhaSegura123!'), true);
});

test('validarSenha - rejeita senhas com menos de 6 caracteres ou nulas', () => {
  assert.equal(validarSenha('12345'), false);
  assert.equal(validarSenha(''), false);
  assert.equal(validarSenha(null), false);
});

test('validarUf - aceita UFs brasileiras válidas', () => {
  assert.equal(validarUf('DF'), true);
  assert.equal(validarUf('sp'), true);
  assert.equal(validarUf('RJ'), true);
  assert.equal(validarUf('GO'), true);
});

test('validarUf - rejeita UFs inválidas', () => {
  assert.equal(validarUf('XX'), false);
  assert.equal(validarUf(''), false);
  assert.equal(validarUf('SAO'), false);
  assert.equal(validarUf(null), false);
});

test('validarCnpj - valida formato e dígitos verificadores', () => {
  // CNPJ de teste com dígitos válidos (ex: Banco do Brasil)
  assert.equal(validarCnpj('00.000.000/0001-91'), true);
  assert.equal(validarCnpj('00000000000191'), true);
  // Rejeita sequências repetidas e dígitos inválidos
  assert.equal(validarCnpj('11.111.111/1111-11'), false);
  assert.equal(validarCnpj('00.000.000/0001-00'), false);
  assert.equal(validarCnpj('123'), false);
  assert.equal(validarCnpj(null), false);
});

test('validarCpf - valida formato e dígitos verificadores', () => {
  // CPF de teste válido
  assert.equal(validarCpf('529.982.247-25'), true);
  assert.equal(validarCpf('52998224725'), true);
  // Rejeita sequências repetidas e inválidos
  assert.equal(validarCpf('111.111.111-11'), false);
  assert.equal(validarCpf('123.456.789-00'), false);
  assert.equal(validarCpf(''), false);
  assert.equal(validarCpf(null), false);
});

test('apenasDigitos - remove caracteres especiais', () => {
  assert.equal(apenasDigitos('123.456.789-00'), '12345678900');
  assert.equal(apenasDigitos('(61) 98888-7777'), '61988887777');
  assert.equal(apenasDigitos(null), '');
});
