const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/server');
const db = require('../src/database/db');
const mockDb = require('../src/database/mockDb');

let server;
let baseUrl;

test.before(async () => {
  db.setCustomExecutor(mockDb);

  server = app.listen(0);
  await new Promise((resolve) => {
    if (server.listening) resolve();
    else server.once('listening', resolve);
  });

  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

test.beforeEach(() => {
  mockDb.reset();
});

test('POST /api/auth/cadastro/cliente - cadastra com sucesso e define cookie HttpOnly', async () => {
  const response = await fetch(`${baseUrl}/api/auth/cadastro/cliente`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Ana Souza',
      email: 'ana@exemplo.com',
      senha: 'senhaSegura123',
      telefone: '(61) 98888-1111'
    })
  });

  assert.equal(response.status, 201);
  const data = await response.json();
  assert.equal(data.sucesso, true);
  assert.equal(data.usuario.email, 'ana@exemplo.com');
  assert.equal(data.usuario.perfil, 'cliente');
  assert.equal(data.usuario.senha, undefined);

  // Verifica que o cookie token HttpOnly foi enviado nos cabeçalhos
  const setCookie = response.headers.get('set-cookie');
  assert.ok(setCookie, 'Deve conter cabeçalho set-cookie');
  assert.match(setCookie, /token=/);
  assert.match(setCookie, /HttpOnly/i);
});

test('POST /api/auth/cadastro/oficina - cadastra oficina com sucesso', async () => {
  const response = await fetch(`${baseUrl}/api/auth/cadastro/oficina`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'José Mecânico',
      email: 'jose@oficina.com.br',
      senha: 'senhaSegura123',
      nomeFantasia: 'Oficina Central',
      cnpj: '00.000.000/0001-91',
      cidade: 'Brasília',
      uf: 'DF'
    })
  });

  assert.equal(response.status, 201);
  const data = await response.json();
  assert.equal(data.sucesso, true);
  assert.equal(data.usuario.perfil, 'oficina');
  assert.equal(data.usuario.nomeFantasia, 'Oficina Central');
});

test('POST /api/auth/cadastro - rejeita campos inválidos com status 400', async () => {
  const response = await fetch(`${baseUrl}/api/auth/cadastro/cliente`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: '',
      email: 'email_invalido',
      senha: '123'
    })
  });

  assert.equal(response.status, 400);
  const data = await response.json();
  assert.equal(data.sucesso, false);
  assert.ok(data.erros.length >= 3);
});

test('POST /api/auth/login - autentica e retorna status 200', async () => {
  // Cadastra usuário
  await fetch(`${baseUrl}/api/auth/cadastro/cliente`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Teste Login',
      email: 'login@exemplo.com',
      senha: 'minhaSenhaSegura'
    })
  });

  // Realiza login
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'login@exemplo.com',
      senha: 'minhaSenhaSegura'
    })
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.sucesso, true);
  assert.equal(data.usuario.email, 'login@exemplo.com');
});

test('POST /api/auth/login - rejeita credenciais incorretas com 401', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'inexistente@exemplo.com',
      senha: 'qualquersenha'
    })
  });

  assert.equal(response.status, 401);
  const data = await response.json();
  assert.equal(data.sucesso, false);
});

test('GET /api/auth/me - retorna dados da sessão autenticada', async () => {
  const regResponse = await fetch(`${baseUrl}/api/auth/cadastro/cliente`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Sessão Teste',
      email: 'sessao@exemplo.com',
      senha: 'senhaSegura123'
    })
  });
  const regData = await regResponse.json();
  const token = regData.token;

  // Consulta /me com Bearer token
  const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  assert.equal(meResponse.status, 200);
  const meData = await meResponse.json();
  assert.equal(meData.sucesso, true);
  assert.equal(meData.usuario.email, 'sessao@exemplo.com');
  assert.equal(meData.usuario.perfil, 'cliente');
});

test('RNF05 - Controle de acesso por perfil (autorizarPerfil)', async () => {
  // 1. Cadastra um cliente
  const cliRes = await fetch(`${baseUrl}/api/auth/cadastro/cliente`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Cliente Autorizacao',
      email: 'cliente.auth@exemplo.com',
      senha: 'senhaSegura123'
    })
  });
  const cliData = await cliRes.json();
  const cliToken = cliData.token;

  // 2. Cadastra uma oficina
  const ofiRes = await fetch(`${baseUrl}/api/auth/cadastro/oficina`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Mecanico Autorizacao',
      email: 'oficina.auth@exemplo.com',
      senha: 'senhaSegura123',
      nomeFantasia: 'Oficina Autorizada',
      cnpj: '00.000.000/0001-91',
      cidade: 'Brasília',
      uf: 'DF'
    })
  });
  const ofiData = await ofiRes.json();
  const ofiToken = ofiData.token;

  // Cliente acessando área de cliente -> 200 OK
  const resCliOnCli = await fetch(`${baseUrl}/api/auth/area-cliente`, {
    headers: { Authorization: `Bearer ${cliToken}` }
  });
  assert.equal(resCliOnCli.status, 200);

  // Cliente acessando área de oficina -> 403 Forbidden
  const resCliOnOfi = await fetch(`${baseUrl}/api/auth/area-oficina`, {
    headers: { Authorization: `Bearer ${cliToken}` }
  });
  assert.equal(resCliOnOfi.status, 403);

  // Oficina acessando área de oficina -> 200 OK
  const resOfiOnOfi = await fetch(`${baseUrl}/api/auth/area-oficina`, {
    headers: { Authorization: `Bearer ${ofiToken}` }
  });
  assert.equal(resOfiOnOfi.status, 200);

  // Oficina acessando área de cliente -> 403 Forbidden
  const resOfiOnCli = await fetch(`${baseUrl}/api/auth/area-cliente`, {
    headers: { Authorization: `Bearer ${ofiToken}` }
  });
  assert.equal(resOfiOnCli.status, 403);

  // Visitante não autenticado tentando acessar qualquer área restrita -> 401 Unauthorized
  const resAnon = await fetch(`${baseUrl}/api/auth/area-cliente`);
  assert.equal(resAnon.status, 401);
});

test('POST /api/auth/logout - limpa cookie de sessão', async () => {
  const response = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST'
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.sucesso, true);
  const setCookie = response.headers.get('set-cookie');
  assert.ok(setCookie);
  // O cookie deve ser expirado/removido
  assert.match(setCookie, /token=;/);
});
