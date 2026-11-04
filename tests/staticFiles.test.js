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

test('GET /perfil.html - serve a página de edição de perfil (RF02)', async () => {
  const res = await fetch(`${baseUrl}/perfil.html`);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /Editar Meu Perfil/);
  assert.match(text, /form-perfil/);
});

test('GET /oficinas.html - serve a página de pesquisa pública de oficinas (RF04)', async () => {
  const res = await fetch(`${baseUrl}/oficinas.html`);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /Pesquisar Oficinas/);
  assert.match(text, /form-busca/);
});

test('GET /oficina.html - serve a página de perfil público da oficina (RF05)', async () => {
  const res = await fetch(`${baseUrl}/oficina.html`);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /Perfil da Oficina/);
});

test('GET /css/style.css - serve a folha de estilos personalizada', async () => {
  const res = await fetch(`${baseUrl}/css/style.css`);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /--of-primary/);
});

// Garantias de apresentação do MVP e integração da edição de serviços.
test('dashboard - mantém um acesso à edição de perfil, remove painel técnico e oferece edição de serviço', async () => {
  const res = await fetch(`${baseUrl}/dashboard.html`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.equal((html.match(/href="\/perfil\.html"/g) || []).length, 1);
  assert.match(html, /Minha Conta/);
  assert.match(html, /Gestão da Oficina/);
  const conteudoVisivel = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  assert.doesNotMatch(conteudoVisivel, /Dados da Conta \(RF02\)|Gestão da Oficina \(RF03\)|Verificação de Controle de Acesso por Perfil/);
  assert.doesNotMatch(html, /btn-testar-cliente|btn-testar-oficina|Atualizar Meus Dados/);
  assert.match(html, /data-acao-servico="editar"/);
  assert.match(html, /method: editando \? 'PUT' : 'POST'/);
  assert.match(html, /btn-cancelar-servico/);
});

test('perfil público - não certifica oficinas sem verificação', async () => {
  const res = await fetch(`${baseUrl}/oficina.html`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.doesNotMatch(html, /Oficina Verificada|credenciada/);
});

test('página inicial - descreve somente funcionalidades disponíveis', async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.doesNotMatch(html, /aprove orçamentos|agende manutenções|receba avaliações/);
  assert.match(html, /consultar os serviços oferecidos/);
});
