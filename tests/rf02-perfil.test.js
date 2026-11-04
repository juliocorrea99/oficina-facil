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

test('RF02 - Cliente edita o próprio perfil com sucesso', async () => {
  // Cadastra cliente
  const cadRes = await fetch(`${baseUrl}/api/auth/cadastro/cliente`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Carlos Original',
      email: 'carlos.original@exemplo.com',
      senha: 'senhaSegura123',
      telefone: '(61) 91111-2222',
      cpf: '529.982.247-25'
    })
  });
  const { token, usuario } = await cadRes.json();

  // Edita o perfil
  const editRes = await fetch(`${baseUrl}/api/usuarios/perfil`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      nome: 'Carlos Atualizado',
      email: 'carlos.novo@exemplo.com',
      telefone: '(61) 98888-7777',
      cpf: '529.982.247-25'
    })
  });

  assert.equal(editRes.status, 200);
  const data = await editRes.json();
  assert.equal(data.sucesso, true);
  assert.equal(data.usuario.id, usuario.id);
  assert.equal(data.usuario.nome, 'Carlos Atualizado');
  assert.equal(data.usuario.email, 'carlos.novo@exemplo.com');
  assert.equal(data.usuario.telefone, '(61) 98888-7777');
  assert.equal(data.usuario.perfilDetalhes.cpf, '529.982.247-25');
  assert.equal(data.usuario.senha, undefined);
  assert.equal(data.usuario.senha_hash, undefined);
});

test('RF02 - Oficina edita o próprio perfil com sucesso', async () => {
  // Cadastra oficina
  const cadRes = await fetch(`${baseUrl}/api/auth/cadastro/oficina`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Marcos Dono',
      email: 'marcos@oficina.com.br',
      senha: 'senhaSegura123',
      nomeFantasia: 'Oficina do Marcos',
      cnpj: '00.000.000/0001-91',
      cidade: 'Brasília',
      uf: 'DF'
    })
  });
  const { token } = await cadRes.json();

  // Atualiza dados da oficina
  const editRes = await fetch(`${baseUrl}/api/usuarios/perfil`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      nome: 'Marcos Atualizado',
      email: 'marcos@oficina.com.br',
      telefone: '(61) 3344-5566',
      nomeFantasia: 'Oficina do Marcos & Filhos',
      razaoSocial: 'Marcos Auto Reparos LTDA',
      cidade: 'Taguatinga',
      uf: 'DF',
      descricao: 'Mais de 15 anos de tradição em motores.'
    })
  });

  assert.equal(editRes.status, 200);
  const data = await editRes.json();
  assert.equal(data.sucesso, true);
  assert.equal(data.usuario.nome, 'Marcos Atualizado');
  assert.equal(data.usuario.perfilDetalhes.nome_fantasia, 'Oficina do Marcos & Filhos');
  assert.equal(data.usuario.perfilDetalhes.cidade, 'Taguatinga');
  assert.equal(data.usuario.perfilDetalhes.descricao, 'Mais de 15 anos de tradição em motores.');
});

test('RF02 / RN01 - Bloqueia alteração para e-mail já pertencente a outra conta', async () => {
  // Cadastra primeiro usuário
  await fetch(`${baseUrl}/api/auth/cadastro/cliente`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Primeiro',
      email: 'primeiro@exemplo.com',
      senha: 'senhaSegura123'
    })
  });

  // Cadastra segundo usuário
  const cadRes2 = await fetch(`${baseUrl}/api/auth/cadastro/cliente`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Segundo',
      email: 'segundo@exemplo.com',
      senha: 'senhaSegura123'
    })
  });
  const { token } = await cadRes2.json();

  // Tenta alterar e-mail do segundo para o e-mail do primeiro
  const editRes = await fetch(`${baseUrl}/api/usuarios/perfil`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      nome: 'Segundo Alterado',
      email: 'primeiro@exemplo.com'
    })
  });

  assert.equal(editRes.status, 409);
  const data = await editRes.json();
  assert.equal(data.sucesso, false);
  assert.match(data.mensagem, /já está em uso/i);
});

test('RF02 - Bloqueia requisição não autenticada e protege senhas', async () => {
  const editRes = await fetch(`${baseUrl}/api/usuarios/perfil`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Invasor',
      email: 'invasor@exemplo.com'
    })
  });

  assert.equal(editRes.status, 401);
});
