const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const codigo = fs.readFileSync(path.join(__dirname, '../public/js/agendar.js'), 'utf8');
const oficina = {
  nomeFantasia: 'Oficina teste',
  servicos: [{id: 3, nome: 'Troca de óleo', duracaoEstimadaMinutos: 45}],
};

async function abrirPagina({usuario = null, oficinaOk = true, busca = '?oficinaId=2'} = {}) {
  const elementos = new Map();
  const requisicoes = [];
  const eventos = {};
  function elemento(id) {
    if (!elementos.has(id)) {
      const classes = new Set();
      elementos.set(id, {
        innerHTML: '', textContent: '', value: '', disabled: false, min: '',
        classList: {add: name => classes.add(name), contains: name => classes.has(name)},
        eventos: {},
        addEventListener(evento, callback) { this.eventos[evento] = callback; },
        append(filho) { this.filhos = [...(this.filhos || []), filho]; },
      });
    }
    return elementos.get(id);
  }
  const document = {
    getElementById: elemento,
    createElement(tagName) { return {tagName, href: '', className: '', textContent: ''}; },
    addEventListener(nome, callback) { eventos[nome] = callback; },
  };
  const fetch = async url => {
    requisicoes.push(url);
    if (url === '/api/oficinas/2') return {
      ok: oficinaOk,
      async json() { return {oficina}; },
    };
    if (url === '/api/veiculos') return {
      ok: true,
      async json() { return {veiculos: [{id: 7, placa: 'ABC1D23', marca: 'Fiat', modelo: 'Argo', ativo: true}]}; },
    };
    throw new Error(`Requisição não esperada: ${url}`);
  };
  vm.runInNewContext(codigo, {
    document, fetch, location: {search: busca}, URLSearchParams,
    obterUsuarioAtual: async () => usuario,
    Date, String, Number, Error,
  }, {filename: 'agendar.js'});
  await eventos.DOMContentLoaded();
  return {elemento, requisicoes};
}

test('visitante sem login vê nome da oficina, mensagem e botão de entrar', async () => {
  const {elemento, requisicoes} = await abrirPagina();
  assert.equal(elemento('nome-oficina').textContent, 'Oficina teste');
  assert.equal(elemento('form-agendar').classList.contains('d-none'), true);
  assert.match(elemento('alerta-agendamento').innerHTML, /Entre com uma conta de Cliente/);
  assert.equal(elemento('alerta-agendamento').filhos[0].href, '/login.html');
  assert.deepEqual(requisicoes, ['/api/oficinas/2']);
});

test('cliente autenticado continua recebendo serviços e veículos', async () => {
  const {elemento, requisicoes} = await abrirPagina({usuario: {perfil: 'cliente'}});
  assert.equal(elemento('nome-oficina').textContent, 'Oficina teste');
  assert.match(elemento('servico').innerHTML, /Troca de óleo/);
  assert.match(elemento('veiculo').innerHTML, /Fiat Argo/);
  assert.equal(elemento('form-agendar').classList.contains('d-none'), false);
  assert.deepEqual(requisicoes, ['/api/oficinas/2', '/api/veiculos']);
});

test('oficina indisponível não deixa carregamento infinito nem exibe formulário', async () => {
  const {elemento} = await abrirPagina({oficinaOk: false});
  assert.equal(elemento('nome-oficina').textContent, 'Oficina indisponível');
  assert.equal(elemento('form-agendar').classList.contains('d-none'), true);
  assert.match(elemento('alerta-agendamento').innerHTML, /Não foi possível carregar os dados da oficina/);
});
