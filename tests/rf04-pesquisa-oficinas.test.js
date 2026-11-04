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

test.beforeEach(async () => {
  mockDb.reset();

  // Cria Oficina 1: Brasília - DF com serviço "Freios"
  const ofi1 = await fetch(`${baseUrl}/api/auth/cadastro/oficina`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Dono DF',
      email: 'df@oficina.com.br',
      senha: 'senhaSegura123',
      nomeFantasia: 'Oficina Central DF',
      cnpj: '00.000.000/0001-91',
      cidade: 'Brasília',
      uf: 'DF'
    })
  });
  const data1 = await ofi1.json();
  await fetch(`${baseUrl}/api/oficinas/me/servicos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data1.token}`
    },
    body: JSON.stringify({
      nome: 'Manutenção de Freios',
      duracaoEstimadaMinutos: 60
    })
  });

  // Cria Oficina 2: Goiânia - GO com serviço "Suspensão"
  const ofi2 = await fetch(`${baseUrl}/api/auth/cadastro/oficina`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Dono GO',
      email: 'go@oficina.com.br',
      senha: 'senhaSegura123',
      nomeFantasia: 'Oficina Goiânia Auto',
      cnpj: '00.000.000/0002-72',
      cidade: 'Goiânia',
      uf: 'GO'
    })
  });
  const data2 = await ofi2.json();
  await fetch(`${baseUrl}/api/oficinas/me/servicos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data2.token}`
    },
    body: JSON.stringify({
      nome: 'Revisão de Suspensão',
      duracaoEstimadaMinutos: 90
    })
  });
});

test('RF04 - Pesquisa pública retorna todas as oficinas reais sem filtros e sem login', async () => {
  const res = await fetch(`${baseUrl}/api/oficinas`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.sucesso, true);
  assert.equal(data.total, 2);
});

test('RF04 - Filtro por cidade', async () => {
  const res = await fetch(`${baseUrl}/api/oficinas?cidade=Brasilia`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.total, 1);
  assert.equal(data.oficinas[0].cidade, 'Brasília');
});

test('RF04 - Filtro por UF', async () => {
  const res = await fetch(`${baseUrl}/api/oficinas?uf=GO`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.total, 1);
  assert.equal(data.oficinas[0].uf, 'GO');
  assert.equal(data.oficinas[0].nomeFantasia, 'Oficina Goiânia Auto');
});

test('RF04 - Filtro por serviço oferecido', async () => {
  const res = await fetch(`${baseUrl}/api/oficinas?servico=Freios`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.total, 1);
  assert.equal(data.oficinas[0].nomeFantasia, 'Oficina Central DF');
});

test('RF04 - Combinação de filtros (Cidade + UF + Serviço)', async () => {
  const res = await fetch(`${baseUrl}/api/oficinas?cidade=Brasilia&uf=DF&servico=Freios`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.total, 1);

  // Combinação sem correspondência
  const resIncompativel = await fetch(`${baseUrl}/api/oficinas?cidade=Goiânia&uf=DF`);
  assert.equal(resIncompativel.status, 200);
  const dataIncompativel = await resIncompativel.json();
  assert.equal(dataIncompativel.total, 0);
  assert.equal(dataIncompativel.oficinas.length, 0);
});
