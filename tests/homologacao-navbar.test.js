'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const inicio = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const auth = fs.readFileSync(path.join(root, 'public', 'js', 'auth.js'), 'utf8');

// Verifica a configuracao necessaria para que o Bootstrap 5 expanda o menu.
test('Homologacao: menu mobile da pagina inicial usa o acionador correto do Bootstrap', () => {
  assert.match(inicio, /<button[^>]*class="navbar-toggler"[^>]*data-bs-toggle="collapse"[^>]*data-bs-target="#navMenu"/);
  assert.doesNotMatch(inicio, /data-bs-dismiss="collapse"/);
  assert.match(inicio, /<div[^>]*class="collapse navbar-collapse[^\"]*"[^>]*id="navMenu"/);
  assert.match(inicio, /bootstrap\.bundle\.min\.js/);
});

// O HTML nao pode repetir o link que ja e criado pelo auth.js.
test('Homologacao: pagina inicial nao duplica o link publico Buscar Oficinas', () => {
  assert.equal((inicio.match(/href="\/oficinas\.html"/g) || []).length, 0);
  const nav = { innerHTML: '' };
  const contexto = {
    document: { getElementById(id) { return id === 'navbar-auth-links' ? nav : null; }, addEventListener() {} },
    window: {},
    console
  };
  vm.runInNewContext(auth, contexto, { filename: 'auth.js' });
  contexto.inicializarNavbar(null);
  assert.equal((nav.innerHTML.match(/>Buscar Oficinas<\/a>/g) || []).length, 1);
  contexto.inicializarNavbar({ perfil: 'cliente', nome: 'Cliente Exemplo' });
  assert.equal((nav.innerHTML.match(/>Buscar Oficinas<\/a>/g) || []).length, 1);
  contexto.inicializarNavbar({ perfil: 'oficina', nome: 'Oficina Exemplo' });
  assert.equal((nav.innerHTML.match(/>Buscar Oficinas<\/a>/g) || []).length, 1);
});

// No menu expandido em celular, os controles devem ocupar linhas separadas.
test('Homologacao: links do menu sao empilhados no mobile e alinhados no desktop', () => {
  assert.match(inicio, /id="navbar-auth-links" class="[^"]*flex-column flex-lg-row[^"]*"/);
  assert.match(inicio, /<meta name="viewport" content="width=device-width, initial-scale=1\.0">/);
});
