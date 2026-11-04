/**
 * Mock em memória do banco de dados para execução de testes automatizados
 * quando o serviço PostgreSQL não estiver ativo no ambiente local.
 */

class MockDatabase {
  constructor() {
    this.reset();
  }

  reset() {
    this.usuarios = [];
    this.clientes = [];
    this.oficinas = [];
    this.proximoUsuarioId = 1;
    this.proximoClienteId = 1;
    this.proximaOficinaId = 1;
    this.inTransaction = false;
    this.backupState = null;
  }

  async query(text, params = []) {
    const trimmed = text.trim();

    // Comandos de transação
    if (/^BEGIN/i.test(trimmed)) {
      this.inTransaction = true;
      this.backupState = {
        usuarios: JSON.parse(JSON.stringify(this.usuarios)),
        clientes: JSON.parse(JSON.stringify(this.clientes)),
        oficinas: JSON.parse(JSON.stringify(this.oficinas)),
        proximoUsuarioId: this.proximoUsuarioId,
        proximoClienteId: this.proximoClienteId,
        proximaOficinaId: this.proximaOficinaId
      };
      return { rows: [], rowCount: 0 };
    }

    if (/^COMMIT/i.test(trimmed)) {
      this.inTransaction = false;
      this.backupState = null;
      return { rows: [], rowCount: 0 };
    }

    if (/^ROLLBACK/i.test(trimmed)) {
      if (this.backupState) {
        this.usuarios = this.backupState.usuarios;
        this.clientes = this.backupState.clientes;
        this.oficinas = this.backupState.oficinas;
        this.proximoUsuarioId = this.backupState.proximoUsuarioId;
        this.proximoClienteId = this.backupState.proximoClienteId;
        this.proximaOficinaId = this.backupState.proximaOficinaId;
      }
      this.inTransaction = false;
      this.backupState = null;
      return { rows: [], rowCount: 0 };
    }

    // 1. Busca usuário por e-mail: SELECT ... FROM usuarios WHERE LOWER(email) = LOWER($1)
    if (/FROM\s+usuarios\s+WHERE\s+LOWER\(email\)\s*=\s*LOWER\(\$1\)/i.test(trimmed)) {
      const email = String(params[0] || '').toLowerCase();
      const user = this.usuarios.find(u => u.email.toLowerCase() === email);
      return { rows: user ? [{ ...user }] : [], rowCount: user ? 1 : 0 };
    }

    // 2. Busca usuário por ID: SELECT ... FROM usuarios WHERE id = $1
    if (/FROM\s+usuarios\s+WHERE\s+id\s*=\s*\$1/i.test(trimmed)) {
      const id = Number(params[0]);
      const user = this.usuarios.find(u => u.id === id);
      if (user) {
        const { senha_hash, ...safeUser } = user;
        return { rows: [safeUser], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    // 3. Insere usuário: INSERT INTO usuarios (nome, email, senha_hash, perfil, telefone) ...
    if (/INSERT\s+INTO\s+usuarios/i.test(trimmed)) {
      const [nome, email, senhaHash, perfil, telefone] = params;
      const lowerEmail = email.toLowerCase();
      if (this.usuarios.some(u => u.email.toLowerCase() === lowerEmail)) {
        const error = new Error('duplicate key value violates unique constraint "idx_usuarios_email_lower"');
        error.code = '23505';
        throw error;
      }
      const novoUsuario = {
        id: this.proximoUsuarioId++,
        nome,
        email,
        senha_hash: senhaHash,
        perfil,
        telefone: telefone || null,
        ativo: true,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      };
      this.usuarios.push(novoUsuario);
      const { senha_hash, ...safeUser } = novoUsuario;
      return { rows: [safeUser], rowCount: 1 };
    }

    // 4. Insere cliente: INSERT INTO clientes (usuario_id, cpf) ...
    if (/INSERT\s+INTO\s+clientes/i.test(trimmed)) {
      const [usuarioId, cpf] = params;
      const novoCliente = {
        id: this.proximoClienteId++,
        usuario_id: Number(usuarioId),
        cpf: cpf || null,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      };
      this.clientes.push(novoCliente);
      return { rows: [novoCliente], rowCount: 1 };
    }

    // 5. Busca cliente por usuario_id: SELECT ... FROM clientes WHERE usuario_id = $1
    if (/FROM\s+clientes\s+WHERE\s+usuario_id\s*=\s*\$1/i.test(trimmed)) {
      const usuarioId = Number(params[0]);
      const cliente = this.clientes.find(c => c.usuario_id === usuarioId);
      return { rows: cliente ? [{ ...cliente }] : [], rowCount: cliente ? 1 : 0 };
    }

    // 6. Busca oficina por CNPJ: SELECT ... FROM oficinas WHERE cnpj = $1
    if (/FROM\s+oficinas\s+WHERE\s+cnpj\s*=\s*\$1/i.test(trimmed)) {
      const cnpj = String(params[0] || '').trim();
      const oficina = this.oficinas.find(o => o.cnpj === cnpj);
      return { rows: oficina ? [{ ...oficina }] : [], rowCount: oficina ? 1 : 0 };
    }

    // 7. Busca oficina por usuario_id: SELECT ... FROM oficinas WHERE usuario_id = $1
    if (/FROM\s+oficinas\s+WHERE\s+usuario_id\s*=\s*\$1/i.test(trimmed)) {
      const usuarioId = Number(params[0]);
      const oficina = this.oficinas.find(o => o.usuario_id === usuarioId);
      return { rows: oficina ? [{ ...oficina }] : [], rowCount: oficina ? 1 : 0 };
    }

    // 8. Insere oficina: INSERT INTO oficinas ...
    if (/INSERT\s+INTO\s+oficinas/i.test(trimmed)) {
      const [
        usuarioId,
        nomeFantasia,
        razaoSocial,
        cnpj,
        telefone,
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        uf,
        descricao
      ] = params;

      if (this.oficinas.some(o => o.cnpj === cnpj)) {
        const error = new Error('duplicate key value violates unique constraint "oficinas_cnpj_key"');
        error.code = '23505';
        throw error;
      }

      const novaOficina = {
        id: this.proximaOficinaId++,
        usuario_id: Number(usuarioId),
        nome_fantasia: nomeFantasia,
        razao_social: razaoSocial || null,
        cnpj,
        telefone: telefone || null,
        cep: cep || null,
        logradouro: logradouro || null,
        numero: numero || null,
        complemento: complemento || null,
        bairro: bairro || null,
        cidade,
        uf,
        descricao: descricao || null,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      };
      this.oficinas.push(novaOficina);
      return { rows: [novaOficina], rowCount: 1 };
    }

    // Fallback genérico
    return { rows: [], rowCount: 0 };
  }

  async getClient() {
    return {
      query: (text, params) => this.query(text, params),
      release: () => {}
    };
  }
}

const mockDb = new MockDatabase();

module.exports = mockDb;
