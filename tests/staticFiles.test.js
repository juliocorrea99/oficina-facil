const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/server');

let server;
let baseUrl;

test.before(async () => {
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

test('GET / - serve a página inicial (index.html)', async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /Oficina Fácil/);
  assert.match(text, /Conectamos motoristas às oficinas/);
});

test('GET /login.html - serve a página de login com Bootstrap 5', async () => {
  const res = await fetch(`${baseUrl}/login.html`);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /Acessar Conta/);
  assert.match(text, /form-login/);
});

test('GET /cadastro.html - serve a página de cadastro com alternador de perfis', async () => {
  const res = await fetch(`${baseUrl}/cadastro.html`);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /Criar Nova Conta/);
  assert.match(text, /perfil-cliente/);
  assert.match(text, /perfil-oficina/);
});

test('GET /dashboard.html - serve a página do painel', async () => {
  const res = await fetch(`${baseUrl}/dashboard.html`);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /Meu Painel/);
});

test('GET /css/style.css - serve a folha de estilos personalizada', async () => {
  const res = await fetch(`${baseUrl}/css/style.css`);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /--of-primary/);
});
