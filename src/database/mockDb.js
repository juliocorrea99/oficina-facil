/**
 * Mock em memória do banco de dados para execução de testes automatizados
 * quando o serviço PostgreSQL não estiver ativo no ambiente local.
 * Cobre RF01, RF02, RF03, RF04 e RF05.
 */

function normalizarTexto(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

class MockDatabase {
  constructor() {
    this.reset();
  }

  reset() {
    this.usuarios = [];
    this.clientes = [];
    this.oficinas = [];
    this.servicos = [];
    this.horarios = [];
    this.disponibilidades = [];

    this.proximoUsuarioId = 1;
    this.proximoClienteId = 1;
    this.proximaOficinaId = 1;
    this.proximoServicoId = 1;
    this.proximoHorarioId = 1;
    this.proximaDisponibilidadeId = 1;

    this.inTransaction = false;
    this.backupState = null;
  }

  async query(text, params = []) {
    const trimmed = text.trim();

    // Transações
    if (/^BEGIN/i.test(trimmed)) {
      this.inTransaction = true;
      this.backupState = {
        usuarios: JSON.parse(JSON.stringify(this.usuarios)),
        clientes: JSON.parse(JSON.stringify(this.clientes)),
        oficinas: JSON.parse(JSON.stringify(this.oficinas)),
        servicos: JSON.parse(JSON.stringify(this.servicos)),
        horarios: JSON.parse(JSON.stringify(this.horarios)),
        disponibilidades: JSON.parse(JSON.stringify(this.disponibilidades)),
        proximoUsuarioId: this.proximoUsuarioId,
        proximoClienteId: this.proximoClienteId,
        proximaOficinaId: this.proximaOficinaId,
        proximoServicoId: this.proximoServicoId,
        proximoHorarioId: this.proximoHorarioId,
        proximaDisponibilidadeId: this.proximaDisponibilidadeId
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
        this.servicos = this.backupState.servicos;
        this.horarios = this.backupState.horarios;
        this.disponibilidades = this.backupState.disponibilidades;
        this.proximoUsuarioId = this.backupState.proximoUsuarioId;
        this.proximoClienteId = this.backupState.proximoClienteId;
        this.proximaOficinaId = this.backupState.proximaOficinaId;
        this.proximoServicoId = this.backupState.proximoServicoId;
        this.proximoHorarioId = this.backupState.proximoHorarioId;
        this.proximaDisponibilidadeId = this.backupState.proximaDisponibilidadeId;
      }
      this.inTransaction = false;
      this.backupState = null;
      return { rows: [], rowCount: 0 };
    }

    // -------------------------------------------------------------------------
    // USUARIOS
    // -------------------------------------------------------------------------

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

    // 3. Insere usuário: INSERT INTO usuarios ...
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

    // 4. Atualiza usuário (RF02): UPDATE usuarios SET nome = $1, email = $2, telefone = $3 ... WHERE id = $4
    if (/UPDATE\s+usuarios\s+SET/i.test(trimmed)) {
      const [nome, email, telefone, id] = params;
      const user = this.usuarios.find(u => u.id === Number(id));
      if (!user) return { rows: [], rowCount: 0 };

      // RN01 check
      const lowerEmail = String(email).toLowerCase();
      if (this.usuarios.some(u => u.id !== user.id && u.email.toLowerCase() === lowerEmail)) {
        const error = new Error('duplicate key value violates unique constraint "idx_usuarios_email_lower"');
        error.code = '23505';
        throw error;
      }

      user.nome = nome;
      user.email = email;
      user.telefone = telefone || null;
      user.atualizado_em = new Date().toISOString();

      const { senha_hash, ...safeUser } = user;
      return { rows: [safeUser], rowCount: 1 };
    }

    // -------------------------------------------------------------------------
    // CLIENTES
    // -------------------------------------------------------------------------

    // 5. Insere cliente: INSERT INTO clientes (usuario_id, cpf) ...
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

    // 6. Busca cliente por usuario_id: SELECT ... FROM clientes WHERE usuario_id = $1
    if (/FROM\s+clientes\s+WHERE\s+usuario_id\s*=\s*\$1/i.test(trimmed)) {
      const usuarioId = Number(params[0]);
      const cliente = this.clientes.find(c => c.usuario_id === usuarioId);
      return { rows: cliente ? [{ ...cliente }] : [], rowCount: cliente ? 1 : 0 };
    }

    // 7. Atualiza cliente (RF02): UPDATE clientes SET cpf = $1 ... WHERE usuario_id = $2
    if (/UPDATE\s+clientes\s+SET/i.test(trimmed)) {
      const [cpf, usuarioId] = params;
      let cliente = this.clientes.find(c => c.usuario_id === Number(usuarioId));
      if (!cliente) {
        cliente = {
          id: this.proximoClienteId++,
          usuario_id: Number(usuarioId),
          cpf: cpf || null,
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        };
        this.clientes.push(cliente);
      } else {
        cliente.cpf = cpf || null;
        cliente.atualizado_em = new Date().toISOString();
      }
      return { rows: [cliente], rowCount: 1 };
    }

    // -------------------------------------------------------------------------
    // OFICINAS
    // -------------------------------------------------------------------------

    // 8. Busca oficina por CNPJ: SELECT ... FROM oficinas WHERE cnpj = $1
    if (/FROM\s+oficinas\s+WHERE\s+cnpj\s*=\s*\$1/i.test(trimmed)) {
      const cnpj = String(params[0] || '').trim();
      const oficina = this.oficinas.find(o => o.cnpj === cnpj);
      return { rows: oficina ? [{ ...oficina }] : [], rowCount: oficina ? 1 : 0 };
    }

    // 9. Busca oficina por ID: SELECT ... FROM oficinas WHERE id = $1
    if (/FROM\s+oficinas\s+WHERE\s+id\s*=\s*\$1/i.test(trimmed)) {
      const id = Number(params[0]);
      const oficina = this.oficinas.find(o => o.id === id);
      return { rows: oficina ? [{ ...oficina }] : [], rowCount: oficina ? 1 : 0 };
    }

    // 10. Busca oficina por usuario_id: SELECT ... FROM oficinas WHERE usuario_id = $1
    if (/FROM\s+oficinas\s+WHERE\s+usuario_id\s*=\s*\$1/i.test(trimmed)) {
      const usuarioId = Number(params[0]);
      const oficina = this.oficinas.find(o => o.usuario_id === usuarioId);
      return { rows: oficina ? [{ ...oficina }] : [], rowCount: oficina ? 1 : 0 };
    }

    // 11. Insere oficina: INSERT INTO oficinas ...
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

    // 12. Atualiza oficina (RF02): UPDATE oficinas SET ... WHERE usuario_id = $12
    if (/UPDATE\s+oficinas\s+SET/i.test(trimmed)) {
      const [
        nomeFantasia,
        razaoSocial,
        telefone,
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        uf,
        descricao,
        usuarioId
      ] = params;

      const oficina = this.oficinas.find(o => o.usuario_id === Number(usuarioId));
      if (!oficina) return { rows: [], rowCount: 0 };

      oficina.nome_fantasia = nomeFantasia;
      oficina.razao_social = razaoSocial || null;
      oficina.telefone = telefone || null;
      oficina.cep = cep || null;
      oficina.logradouro = logradouro || null;
      oficina.numero = numero || null;
      oficina.complemento = complemento || null;
      oficina.bairro = bairro || null;
      oficina.cidade = cidade;
      oficina.uf = uf;
      oficina.descricao = descricao || null;
      oficina.atualizado_em = new Date().toISOString();

      return { rows: [oficina], rowCount: 1 };
    }

    // 13. Pesquisa pública de oficinas (RF04): SELECT ... FROM oficinas o WHERE ...
    if (/FROM\s+oficinas\s+o/i.test(trimmed)) {
      let filtradas = [...this.oficinas];

      for (const param of params) {
        const str = String(param);
        if (str.startsWith('%') && str.endsWith('%')) {
          const termo = str.slice(1, -1);
          const termoNorm = normalizarTexto(termo);
          filtradas = filtradas.filter(o => {
            const matchCidade = normalizarTexto(o.cidade).includes(termoNorm);
            const servicosOficina = this.servicos.filter(s => s.oficina_id === o.id && s.ativo);
            const matchServico = servicosOficina.some(s => normalizarTexto(s.nome).includes(termoNorm));
            return matchCidade || matchServico;
          });
        } else if (str.length === 2) {
          // Filtro de UF
          const uf = str.toUpperCase();
          filtradas = filtradas.filter(o => o.uf.toUpperCase() === uf);
        }
      }

      const rows = filtradas.map(o => {
        const servicos = this.servicos
          .filter(s => s.oficina_id === o.id && s.ativo)
          .map(s => s.nome)
          .sort();
        return {
          id: o.id,
          nome_fantasia: o.nome_fantasia,
          razao_social: o.razao_social,
          cidade: o.cidade,
          uf: o.uf,
          bairro: o.bairro,
          telefone: o.telefone,
          descricao: o.descricao,
          servicos
        };
      });

      return { rows, rowCount: rows.length };
    }

    // -------------------------------------------------------------------------
    // SERVIÇOS (RF03, RF05)
    // -------------------------------------------------------------------------

    // 14. Insere serviço: INSERT INTO servicos ...
    if (/INSERT\s+INTO\s+servicos/i.test(trimmed)) {
      const [oficinaId, nome, descricao, duracao, preco] = params;
      const novoServico = {
        id: this.proximoServicoId++,
        oficina_id: Number(oficinaId),
        nome,
        descricao: descricao || null,
        duracao_estimada_minutos: Number(duracao),
        preco_estimado: preco !== null && preco !== undefined ? Number(preco) : null,
        ativo: true,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      };
      this.servicos.push(novoServico);
      return { rows: [novoServico], rowCount: 1 };
    }

    // 15. Busca serviço por ID: SELECT ... FROM servicos WHERE id = $1
    if (/FROM\s+servicos\s+WHERE\s+id\s*=\s*\$1/i.test(trimmed)) {
      const id = Number(params[0]);
      const servico = this.servicos.find(s => s.id === id);
      return { rows: servico ? [{ ...servico }] : [], rowCount: servico ? 1 : 0 };
    }

    // 16. Lista serviços por oficina: SELECT ... FROM servicos WHERE oficina_id = $1 ...
    if (/FROM\s+servicos\s+WHERE\s+oficina_id\s*=\s*\$1/i.test(trimmed)) {
      const oficinaId = Number(params[0]);
      const apenasAtivos = /AND\s+ativo\s*=\s*true/i.test(trimmed);
      let lista = this.servicos.filter(s => s.oficina_id === oficinaId);
      if (apenasAtivos) {
        lista = lista.filter(s => s.ativo);
      }
      lista.sort((a, b) => a.nome.localeCompare(b.nome));
      return { rows: lista.map(s => ({ ...s })), rowCount: lista.length };
    }

    // 17. Atualiza serviço: UPDATE servicos SET ... WHERE id = $6 AND oficina_id = $7
    if (/UPDATE\s+servicos\s+SET\s+nome/i.test(trimmed)) {
      const [nome, descricao, duracao, preco, ativo, id, oficinaId] = params;
      const servico = this.servicos.find(s => s.id === Number(id) && s.oficina_id === Number(oficinaId));
      if (!servico) return { rows: [], rowCount: 0 };

      servico.nome = nome;
      servico.descricao = descricao || null;
      servico.duracao_estimada_minutos = Number(duracao);
      servico.preco_estimado = preco !== null && preco !== undefined ? Number(preco) : null;
      servico.ativo = Boolean(ativo);
      servico.atualizado_em = new Date().toISOString();

      return { rows: [{ ...servico }], rowCount: 1 };
    }

    // 18. Alterna status de serviço: UPDATE servicos SET ativo = $1 ... WHERE id = $2 AND oficina_id = $3
    if (/UPDATE\s+servicos\s+SET\s+ativo/i.test(trimmed)) {
      const [ativo, id, oficinaId] = params;
      const servico = this.servicos.find(s => s.id === Number(id) && s.oficina_id === Number(oficinaId));
      if (!servico) return { rows: [], rowCount: 0 };

      servico.ativo = Boolean(ativo);
      servico.atualizado_em = new Date().toISOString();
      return { rows: [{ ...servico }], rowCount: 1 };
    }

    // -------------------------------------------------------------------------
    // HORÁRIOS DE FUNCIONAMENTO (RF03, RF05)
    // -------------------------------------------------------------------------

    // 19. Insere/Atualiza horário: INSERT INTO horarios_funcionamento ... ON CONFLICT
    if (/INSERT\s+INTO\s+horarios_funcionamento/i.test(trimmed)) {
      const [oficinaId, diaSemana, abertura, fechamento, fechado] = params;
      const oId = Number(oficinaId);
      const dia = Number(diaSemana);

      let horario = this.horarios.find(h => h.oficina_id === oId && h.dia_semana === dia);
      if (!horario) {
        horario = {
          id: this.proximoHorarioId++,
          oficina_id: oId,
          dia_semana: dia,
          horario_abertura: abertura || null,
          horario_fechamento: fechamento || null,
          fechado: Boolean(fechado),
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        };
        this.horarios.push(horario);
      } else {
        horario.horario_abertura = abertura || null;
        horario.horario_fechamento = fechamento || null;
        horario.fechado = Boolean(fechado);
        horario.atualizado_em = new Date().toISOString();
      }
      return { rows: [{ ...horario }], rowCount: 1 };
    }

    // 20. Lista horários por oficina: SELECT ... FROM horarios_funcionamento WHERE oficina_id = $1
    if (/FROM\s+horarios_funcionamento\s+WHERE\s+oficina_id\s*=\s*\$1/i.test(trimmed)) {
      const oficinaId = Number(params[0]);
      const lista = this.horarios
        .filter(h => h.oficina_id === oficinaId)
        .sort((a, b) => a.dia_semana - b.dia_semana);

      return { rows: lista.map(h => ({ ...h })), rowCount: lista.length };
    }

    // -------------------------------------------------------------------------
    // DISPONIBILIDADE (RF03, RF05, RF07)
    // -------------------------------------------------------------------------

    // 21. Insere disponibilidade: INSERT INTO disponibilidades ...
    if (/^INSERT\s+INTO\s+disponibilidades/i.test(trimmed)) {
      const [oficinaId, data, inicio, fim, vagas] = params;
      const novaDisp = {
        id: this.proximaDisponibilidadeId++,
        oficina_id: Number(oficinaId),
        data: String(data),
        horario_inicio: String(inicio),
        horario_fim: String(fim),
        vagas_simultaneas: Number(vagas),
        ativo: true,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      };
      this.disponibilidades.push(novaDisp);
      return { rows: [{ ...novaDisp }], rowCount: 1 };
    }

    // 22. Deleta disponibilidade: DELETE FROM disponibilidades WHERE id = $1 AND oficina_id = $2
    if (/^DELETE\s+FROM\s+disponibilidades/i.test(trimmed)) {
      const [id, oficinaId] = params;
      const index = this.disponibilidades.findIndex(d => d.id === Number(id) && d.oficina_id === Number(oficinaId));
      if (index !== -1) {
        this.disponibilidades.splice(index, 1);
        return { rows: [{ id: Number(id) }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    // 23. Busca disponibilidade por ID: SELECT ... FROM disponibilidades WHERE id = $1
    if (/^SELECT\s+.*FROM\s+disponibilidades\s+WHERE\s+id\s*=\s*\$1/is.test(trimmed)) {
      const id = Number(params[0]);
      const disp = this.disponibilidades.find(d => d.id === id);
      return { rows: disp ? [{ ...disp }] : [], rowCount: disp ? 1 : 0 };
    }

    // 24. Lista disponibilidades por oficina: SELECT ... FROM disponibilidades WHERE oficina_id = $1
    if (/^SELECT\s+.*FROM\s+disponibilidades\s+WHERE\s+oficina_id\s*=\s*\$1/is.test(trimmed)) {
      const oficinaId = Number(params[0]);
      const lista = this.disponibilidades
        .filter(d => d.oficina_id === oficinaId && d.ativo)
        .sort((a, b) => (a.data + a.horario_inicio).localeCompare(b.data + b.horario_inicio));

      return { rows: lista.map(d => ({ ...d })), rowCount: lista.length };
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
