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

test('RF05 - Perfil público da oficina exibe dados autorizados e estado vazio de avaliações', async () => {
  // Cadastra oficina
  const ofiRes = await fetch(`${baseUrl}/api/auth/cadastro/oficina`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Mecânico Chefe',
      email: 'chefe@oficina.com.br',
      senha: 'senhaSegura123',
      nomeFantasia: 'Oficina Modelo',
      razaoSocial: 'Modelo Serviços Automotivos LTDA',
      cnpj: '00.000.000/0001-91',
      telefone: '(61) 3333-8888',
      cidade: 'Brasília',
      uf: 'DF',
      descricao: 'Oficina especializada em diagnóstico eletrônico.'
    })
  });
  const { token, usuario } = await ofiRes.json();
  const oficinaId = usuario.oficinaId;

  // Cadastra serviço ativo
  await fetch(`${baseUrl}/api/oficinas/me/servicos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      nome: 'Diagnóstico por Scanner',
      descricao: 'Leitura de injeção eletrônica e sensores',
      duracaoEstimadaMinutos: 45,
      precoEstimado: 150.00
    })
  });

  // Cadastra horário
  await fetch(`${baseUrl}/api/oficinas/me/horarios`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      horarios: [
        { diaSemana: 1, horarioAbertura: '08:00', horarioFechamento: '18:00', fechado: false }
      ]
    })
  });

  // Consulta perfil público sem estar logado
  const pubRes = await fetch(`${baseUrl}/api/oficinas/${oficinaId}`);
  assert.equal(pubRes.status, 200);

  const data = await pubRes.json();
  assert.equal(data.sucesso, true);
  const ofi = data.oficina;

  assert.equal(ofi.id, oficinaId);
  assert.equal(ofi.nomeFantasia, 'Oficina Modelo');
  assert.equal(ofi.cidade, 'Brasília');
  assert.equal(ofi.uf, 'DF');
  assert.equal(ofi.telefone, '(61) 3333-8888');
  assert.equal(ofi.descricao, 'Oficina especializada em diagnóstico eletrônico.');

  // Confirma catálogo de serviços ativos
  assert.equal(ofi.servicos.length, 1);
  assert.equal(ofi.servicos[0].nome, 'Diagnóstico por Scanner');

  // Confirma horários
  assert.equal(ofi.horarios.length, 1);
  assert.equal(ofi.horarios[0].horarioAbertura, '08:00');

  // Confirma estado vazio de avaliações (RF14 não implementado)
  assert.deepEqual(ofi.avaliacoes, [], 'Avaliações devem ser vazias sem dados fictícios');

  // Segurança (RNF05): Garante ausência de dados sensíveis ou senhas
  assert.equal(ofi.senha, undefined);
  assert.equal(ofi.senha_hash, undefined);
  assert.equal(ofi.token, undefined);
});

test('RF05 - Retorna 404 para ID de oficina inexistente', async () => {
  const res = await fetch(`${baseUrl}/api/oficinas/9999`);
  assert.equal(res.status, 404);
  const data = await res.json();
  assert.equal(data.sucesso, false);
  assert.match(data.mensagem, /não encontrada/i);
});
