const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/database/db');
const mockDb = require('../src/database/mockDb');
const authService = require('../src/services/authService');

test.beforeEach(() => {
  db.setCustomExecutor(mockDb);
  mockDb.reset();
});

test('cadastrarCliente - cria cliente com sucesso e retorna token sem expor hash da senha', async () => {
  const resultado = await authService.cadastrarCliente({
    nome: 'Carlos Silva',
    email: 'carlos@exemplo.com',
    senha: 'senhaForte123',
    telefone: '(61) 99999-8888',
    cpf: '529.982.247-25'
  });

  assert.ok(resultado.token, 'Token JWT deve ser gerado');
  assert.equal(resultado.usuario.nome, 'Carlos Silva');
  assert.equal(resultado.usuario.email, 'carlos@exemplo.com');
  assert.equal(resultado.usuario.perfil, 'cliente');
  assert.equal(resultado.usuario.senha, undefined, 'A senha nunca deve ser retornada');
  assert.equal(resultado.usuario.senha_hash, undefined, 'O hash da senha nunca deve ser retornado');
});

test('RN01 - Impede cadastro com e-mail duplicado (mesmo caso ou case insensitive)', async () => {
  await authService.cadastrarCliente({
    nome: 'Primeiro Usuario',
    email: 'unico@exemplo.com',
    senha: 'senhaForte123'
  });

  // Tenta cadastrar novamente com o mesmo e-mail exato
  await assert.rejects(
    async () => {
      await authService.cadastrarCliente({
        nome: 'Segundo Usuario',
        email: 'unico@exemplo.com',
        senha: 'outraSenha123'
      });
    },
    (err) => {
      assert.equal(err.status, 409);
      assert.match(err.message, /já está cadastrado/i);
      return true;
    }
  );

  // Tenta cadastrar com variações de maiúsculas/minúsculas
  await assert.rejects(
    async () => {
      await authService.cadastrarCliente({
        nome: 'Terceiro Usuario',
        email: 'UNICO@EXEMPLO.COM',
        senha: 'outraSenha123'
      });
    },
    (err) => {
      assert.equal(err.status, 409);
      return true;
    }
  );
});

test('cadastrarOficina - cria oficina com sucesso e persiste dados específicos', async () => {
  const resultado = await authService.cadastrarOficina({
    nome: 'Roberto Mecânico',
    email: 'oficina@auto.com.br',
    senha: 'senhaSegura123',
    telefone: '(61) 3333-4444',
    nomeFantasia: 'Auto Mecânica Silva',
    razaoSocial: 'Silva e Filhos LTDA',
    cnpj: '00.000.000/0001-91',
    cidade: 'Brasília',
    uf: 'DF'
  });

  assert.ok(resultado.token);
  assert.equal(resultado.usuario.perfil, 'oficina');
  assert.equal(resultado.usuario.nomeFantasia, 'Auto Mecânica Silva');
  assert.equal(resultado.usuario.cidade, 'Brasília');
  assert.equal(resultado.usuario.uf, 'DF');
  assert.equal(resultado.usuario.senha_hash, undefined);
});

test('cadastrarOficina - rejeita CNPJ duplicado', async () => {
  await authService.cadastrarOficina({
    nome: 'Oficina Um',
    email: 'oficina1@auto.com.br',
    senha: 'senhaSegura123',
    nomeFantasia: 'Oficina Um LTDA',
    cnpj: '00.000.000/0001-91',
    cidade: 'Brasília',
    uf: 'DF'
  });

  await assert.rejects(
    async () => {
      await authService.cadastrarOficina({
        nome: 'Oficina Dois',
        email: 'oficina2@auto.com.br',
        senha: 'senhaSegura123',
        nomeFantasia: 'Oficina Dois LTDA',
        cnpj: '00.000.000/0001-91',
        cidade: 'Goiânia',
        uf: 'GO'
      });
    },
    (err) => {
      assert.equal(err.status, 409);
      assert.match(err.message, /CNPJ já está cadastrado/i);
      return true;
    }
  );
});

test('autenticarUsuario - realiza login com credenciais corretas', async () => {
  await authService.cadastrarCliente({
    nome: 'Maria Fernandes',
    email: 'maria@exemplo.com',
    senha: 'senhaCorreta123'
  });

  const auth = await authService.autenticarUsuario('maria@exemplo.com', 'senhaCorreta123');
  assert.ok(auth.token);
  assert.equal(auth.usuario.email, 'maria@exemplo.com');
  assert.equal(auth.usuario.nome, 'Maria Fernandes');
  assert.equal(auth.usuario.perfil, 'cliente');
});

test('autenticarUsuario - rejeita senha incorreta', async () => {
  await authService.cadastrarCliente({
    nome: 'Maria Fernandes',
    email: 'maria@exemplo.com',
    senha: 'senhaCorreta123'
  });

  await assert.rejects(
    async () => {
      await authService.autenticarUsuario('maria@exemplo.com', 'senhaErrada999');
    },
    (err) => {
      assert.equal(err.status, 401);
      assert.match(err.message, /incorretos/i);
      return true;
    }
  );
});

test('autenticarUsuario - rejeita e-mail inexistente', async () => {
  await assert.rejects(
    async () => {
      await authService.autenticarUsuario('inexistente@exemplo.com', 'qualquerSenha');
    },
    (err) => {
      assert.equal(err.status, 401);
      assert.match(err.message, /incorretos/i);
      return true;
    }
  );
});

test('obterPerfilUsuario - retorna os dados corretos do cliente autenticado', async () => {
  const { usuario } = await authService.cadastrarCliente({
    nome: 'Lucas Mendes',
    email: 'lucas@exemplo.com',
    senha: 'senhaSegura123',
    cpf: '529.982.247-25'
  });

  const perfil = await authService.obterPerfilUsuario(usuario.id);
  assert.equal(perfil.id, usuario.id);
  assert.equal(perfil.email, 'lucas@exemplo.com');
  assert.equal(perfil.perfil, 'cliente');
  assert.equal(perfil.perfilDetalhes.cpf, '529.982.247-25');
});
