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

test('RF03 - Gestão completa de serviços (cadastrar, listar, editar, inativar)', async () => {
  // Cadastra oficina
  const ofiRes = await fetch(`${baseUrl}/api/auth/cadastro/oficina`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'José Mecânico',
      email: 'jose@oficina.com.br',
      senha: 'senhaSegura123',
      nomeFantasia: 'Oficina do Zé',
      cnpj: '00.000.000/0001-91',
      cidade: 'Brasília',
      uf: 'DF'
    })
  });
  const { token } = await ofiRes.json();

  // 1. Cadastra serviço
  const cadServRes = await fetch(`${baseUrl}/api/oficinas/me/servicos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      nome: 'Troca de Pastilha de Freio',
      descricao: 'Troca das pastilhas dianteiras',
      duracaoEstimadaMinutos: 90,
      precoEstimado: 250.00
    })
  });
  assert.equal(cadServRes.status, 201);
  const cadServData = await cadServRes.json();
  assert.equal(cadServData.sucesso, true);
  assert.equal(cadServData.servico.nome, 'Troca de Pastilha de Freio');
  assert.equal(cadServData.servico.duracaoEstimadaMinutos, 90);
  assert.equal(cadServData.servico.ativo, true);
  const servicoId = cadServData.servico.id;

  // 2. Lista serviços da oficina
  const listServRes = await fetch(`${baseUrl}/api/oficinas/me/servicos`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.equal(listServRes.status, 200);
  const listServData = await listServRes.json();
  assert.equal(listServData.servicos.length, 1);

  // 3. Edita serviço
  const editServRes = await fetch(`${baseUrl}/api/oficinas/me/servicos/${servicoId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      nome: 'Troca de Pastilha e Disco de Freio',
      descricao: 'Troca completa dianteira',
      duracaoEstimadaMinutos: 120,
      precoEstimado: 450.00,
      ativo: true
    })
  });
  assert.equal(editServRes.status, 200);
  const editServData = await editServRes.json();
  assert.equal(editServData.servico.nome, 'Troca de Pastilha e Disco de Freio');
  assert.equal(editServData.servico.duracaoEstimadaMinutos, 120);

  // 4. Inativa serviço (PATCH status)
  const toggleRes = await fetch(`${baseUrl}/api/oficinas/me/servicos/${servicoId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ ativo: false })
  });
  assert.equal(toggleRes.status, 200);
  const toggleData = await toggleRes.json();
  assert.equal(toggleData.servico.ativo, false);
});

test('RF03 / RN06 - Impede que uma oficina altere serviço de outra oficina', async () => {
  // Oficina 1
  const ofi1Res = await fetch(`${baseUrl}/api/auth/cadastro/oficina`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Oficina 1',
      email: 'oficina1@teste.com',
      senha: 'senhaSegura123',
      nomeFantasia: 'Oficina Um',
      cnpj: '00.000.000/0001-91',
      cidade: 'Brasília',
      uf: 'DF'
    })
  });
  const { token: tokenOfi1 } = await ofi1Res.json();

  // Cria serviço na Oficina 1
  const servRes = await fetch(`${baseUrl}/api/oficinas/me/servicos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenOfi1}`
    },
    body: JSON.stringify({
      nome: 'Alinhamento 3D',
      duracaoEstimadaMinutos: 40
    })
  });
  const { servico } = await servRes.json();

  // Oficina 2
  const ofi2Res = await fetch(`${baseUrl}/api/auth/cadastro/oficina`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Oficina 2',
      email: 'oficina2@teste.com',
      senha: 'senhaSegura123',
      nomeFantasia: 'Oficina Dois',
      cnpj: '00.000.000/0002-72',
      cidade: 'Goiânia',
      uf: 'GO'
    })
  });
  const { token: tokenOfi2 } = await ofi2Res.json();

  // Oficina 2 tenta alterar o serviço da Oficina 1
  const invasaoRes = await fetch(`${baseUrl}/api/oficinas/me/servicos/${servico.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenOfi2}`
    },
    body: JSON.stringify({
      nome: 'Serviço Invadido',
      duracaoEstimadaMinutos: 99
    })
  });
  assert.equal(invasaoRes.status, 404);
});

test('RF03 - Gestão de horários de funcionamento e validação de intervalos', async () => {
  const ofiRes = await fetch(`${baseUrl}/api/auth/cadastro/oficina`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Oficina Horários',
      email: 'horarios@oficina.com.br',
      senha: 'senhaSegura123',
      nomeFantasia: 'Oficina Pontual',
      cnpj: '00.000.000/0001-91',
      cidade: 'Brasília',
      uf: 'DF'
    })
  });
  const { token } = await ofiRes.json();

  // Configura horários válidos
  const salvarRes = await fetch(`${baseUrl}/api/oficinas/me/horarios`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      horarios: [
        { diaSemana: 1, horarioAbertura: '08:00', horarioFechamento: '18:00', fechado: false },
        { diaSemana: 2, horarioAbertura: '08:00', horarioFechamento: '18:00', fechado: false },
        { diaSemana: 0, horarioAbertura: null, horarioFechamento: null, fechado: true }
      ]
    })
  });
  assert.equal(salvarRes.status, 200);

  // Consulta horários
  const getRes = await fetch(`${baseUrl}/api/oficinas/me/horarios`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.equal(getRes.status, 200);
  const data = await getRes.json();
  assert.equal(data.horarios.length, 3);

  // Rejeita horário inconsistente (abertura >= fechamento)
  const badRes = await fetch(`${baseUrl}/api/oficinas/me/horarios`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      horarios: [
        { diaSemana: 3, horarioAbertura: '18:00', horarioFechamento: '08:00', fechado: false }
      ]
    })
  });
  assert.equal(badRes.status, 400);
});

test('RF03 - Gestão de disponibilidades de atendimento na agenda', async () => {
  const ofiRes = await fetch(`${baseUrl}/api/auth/cadastro/oficina`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Oficina Disp',
      email: 'disp@oficina.com.br',
      senha: 'senhaSegura123',
      nomeFantasia: 'Oficina Agenda',
      cnpj: '00.000.000/0001-91',
      cidade: 'Brasília',
      uf: 'DF'
    })
  });
  const { token } = await ofiRes.json();

  // 1. Cadastra janela de disponibilidade
  const cadRes = await fetch(`${baseUrl}/api/oficinas/me/disponibilidades`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      data: '2026-11-15',
      horarioInicio: '08:00',
      horarioFim: '12:00',
      vagasSimultaneas: 3
    })
  });
  assert.equal(cadRes.status, 201);
  const cadData = await cadRes.json();
  assert.equal(cadData.disponibilidade.vagasSimultaneas, 3);
  const dispId = cadData.disponibilidade.id;

  // 2. Lista disponibilidades
  const listRes = await fetch(`${baseUrl}/api/oficinas/me/disponibilidades`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.equal(listData.disponibilidades.length, 1);

  // 3. Remove disponibilidade
  const delRes = await fetch(`${baseUrl}/api/oficinas/me/disponibilidades/${dispId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.equal(delRes.status, 200);

  // 4. Confirma remoção
  const listRes2 = await fetch(`${baseUrl}/api/oficinas/me/disponibilidades`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const listData2 = await listRes2.json();
  assert.equal(listData2.disponibilidades.length, 0);
});

test('RF03 / RNF05 - Cliente não pode acessar rotas exclusivas de oficina', async () => {
  const cliRes = await fetch(`${baseUrl}/api/auth/cadastro/cliente`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Cliente Tentando Acesso',
      email: 'cliente.invasor@exemplo.com',
      senha: 'senhaSegura123'
    })
  });
  const { token } = await cliRes.json();

  const res = await fetch(`${baseUrl}/api/oficinas/me/servicos`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.equal(res.status, 403);
});
