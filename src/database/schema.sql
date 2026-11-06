-- ==========================================================
-- Oficina Fácil - Script DDL de Estrutura Inicial do Banco
-- Requisitos atendidos: RF01 a RF05
-- Regras atendidas: RN01 (Unicidade de e-mail), RN03 (Disponibilidade), RN06 (Controle oficina), RNF05 (Segurança)
-- ==========================================================

-- Tabela principal de usuários do sistema (RF01, RF02)
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    perfil VARCHAR(20) NOT NULL CHECK (perfil IN ('cliente', 'oficina')),
    telefone VARCHAR(20),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RN01: Cada e-mail deve identificar uma única conta ativa no sistema
-- Índice único insensível a maiúsculas/minúsculas para garantir unicidade
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email_lower ON usuarios (LOWER(email));

-- Tabela complementar de perfil: Cliente (RF01, RF02)
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    cpf VARCHAR(14),
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabela complementar de perfil: Oficina (RF01, RF02, RF04, RF05)
CREATE TABLE IF NOT EXISTS oficinas (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    nome_fantasia VARCHAR(150) NOT NULL,
    razao_social VARCHAR(150),
    cnpj VARCHAR(18) NOT NULL UNIQUE,
    telefone VARCHAR(20),
    cep VARCHAR(10),
    logradouro VARCHAR(200),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100) NOT NULL,
    uf VARCHAR(2) NOT NULL,
    descricao TEXT,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para otimização de consultas (busca por cidade/UF - RF04)
CREATE INDEX IF NOT EXISTS idx_oficinas_cidade_uf ON oficinas (cidade, uf);
CREATE INDEX IF NOT EXISTS idx_oficinas_cnpj ON oficinas (cnpj);

-- Tabela de serviços oferecidos pelas oficinas (RF03, RF04, RF05)
CREATE TABLE IF NOT EXISTS servicos (
    id SERIAL PRIMARY KEY,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
    nome VARCHAR(120) NOT NULL,
    descricao TEXT,
    duracao_estimada_minutos INTEGER NOT NULL CHECK (duracao_estimada_minutos > 0),
    preco_estimado NUMERIC(10, 2),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_servicos_oficina_id ON servicos (oficina_id);
CREATE INDEX IF NOT EXISTS idx_servicos_nome ON servicos (LOWER(nome));
CREATE INDEX IF NOT EXISTS idx_servicos_ativo ON servicos (ativo);

-- Tabela de horários de funcionamento semanal da oficina (RF03, RF05)
-- dia_semana: 0 = Domingo, 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado
CREATE TABLE IF NOT EXISTS horarios_funcionamento (
    id SERIAL PRIMARY KEY,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    horario_abertura TIME,
    horario_fechamento TIME,
    fechado BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_horarios_oficina_dia UNIQUE (oficina_id, dia_semana),
    CONSTRAINT chk_horarios_validos CHECK (
        fechado = TRUE OR (
            horario_abertura IS NOT NULL AND
            horario_fechamento IS NOT NULL AND
            horario_abertura < horario_fechamento
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_horarios_oficina_id ON horarios_funcionamento (oficina_id);

-- Tabela de janelas de disponibilidade na agenda para futuros agendamentos (RF03, RF05, RF07)
CREATE TABLE IF NOT EXISTS disponibilidades (
    id SERIAL PRIMARY KEY,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    horario_inicio TIME NOT NULL,
    horario_fim TIME NOT NULL,
    vagas_simultaneas INTEGER NOT NULL DEFAULT 1 CHECK (vagas_simultaneas > 0),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_intervalo_disponibilidade CHECK (horario_inicio < horario_fim)
);

CREATE INDEX IF NOT EXISTS idx_disponibilidades_oficina_data ON disponibilidades (oficina_id, data);

-- RF06-RF09: estrutura idempotente para veiculos e agenda.
-- Mesma definicao de src/database/migrations/003_veiculos_agendamentos.sql
-- RF06-RF09: veiculos, agendamentos e trilha de auditoria.
-- A migracao nao remove nem altera dados anteriores.
CREATE TABLE IF NOT EXISTS veiculos (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  placa VARCHAR(7) NOT NULL,
  marca VARCHAR(80) NOT NULL,
  modelo VARCHAR(100) NOT NULL,
  ano INTEGER CHECK (ano BETWEEN 1886 AND 2100),
  apelido VARCHAR(80),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_veiculos_cliente_placa ON veiculos(cliente_id, placa);
CREATE INDEX IF NOT EXISTS idx_veiculos_cliente ON veiculos(cliente_id);

CREATE TABLE IF NOT EXISTS agendamentos (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE RESTRICT,
  veiculo_id INTEGER NOT NULL REFERENCES veiculos(id) ON DELETE RESTRICT,
  servico_id INTEGER NOT NULL REFERENCES servicos(id) ON DELETE RESTRICT,
  disponibilidade_id INTEGER NOT NULL REFERENCES disponibilidades(id) ON DELETE RESTRICT,
  data DATE NOT NULL,
  horario_inicio TIME NOT NULL,
  horario_fim TIME NOT NULL,
  observacoes VARCHAR(500),
  status VARCHAR(20) NOT NULL DEFAULT 'agendado'
    CHECK (status IN ('agendado', 'cancelado', 'recebido')),
  motivo_cancelamento VARCHAR(500),
  cancelado_em TIMESTAMPTZ,
  recebido_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_agendamento_horario CHECK (horario_inicio < horario_fim)
);
CREATE INDEX IF NOT EXISTS idx_agendamento_oficina_data ON agendamentos(oficina_id, data, horario_inicio);
CREATE INDEX IF NOT EXISTS idx_agendamento_cliente ON agendamentos(cliente_id, data);
CREATE INDEX IF NOT EXISTS idx_agendamento_disponibilidade ON agendamentos(disponibilidade_id, data);
CREATE UNIQUE INDEX IF NOT EXISTS uq_agendamento_veiculo_inicio_ativo
  ON agendamentos(veiculo_id, data, horario_inicio) WHERE status <> 'cancelado';

CREATE TABLE IF NOT EXISTS agendamento_eventos (
  id SERIAL PRIMARY KEY,
  agendamento_id INTEGER NOT NULL REFERENCES agendamentos(id) ON DELETE RESTRICT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  acao VARCHAR(30) NOT NULL CHECK (acao IN ('criado', 'reagendado', 'cancelado')),
  registrado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_agendamento_eventos_agendamento ON agendamento_eventos(agendamento_id);
-- RF10-RF13 / RN06-RN10, RNF10: ordem de serviço, orçamento e auditoria.
-- Não altera nem apaga dados preexistentes.
CREATE TABLE IF NOT EXISTS ordens_servico (
  id SERIAL PRIMARY KEY,
  agendamento_id INTEGER NOT NULL UNIQUE REFERENCES agendamentos(id) ON DELETE RESTRICT,
  status VARCHAR(30) NOT NULL DEFAULT 'recebido'
    CHECK (status IN ('recebido','diagnostico','orcamento','aguardando_aprovacao',
                     'em_manutencao','finalizado','entregue','cancelado')),
  diagnostico TEXT,
  orcamento_versao INTEGER NOT NULL DEFAULT 0 CHECK (orcamento_versao >= 0),
  versao_aprovada INTEGER CHECK (versao_aprovada >= 1),
  decisao_orcamento VARCHAR(15) CHECK (decisao_orcamento IN ('aprovado','recusado')),
  decisao_em TIMESTAMPTZ,
  motivo_recusa VARCHAR(500),
  motivo_cancelamento VARCHAR(500),
  encerrado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_versao_aprovada CHECK (versao_aprovada IS NULL OR versao_aprovada <= orcamento_versao)
);
CREATE INDEX IF NOT EXISTS idx_ordens_status ON ordens_servico(status);

CREATE TABLE IF NOT EXISTS orcamento_itens (
  id SERIAL PRIMARY KEY,
  ordem_id INTEGER NOT NULL REFERENCES ordens_servico(id) ON DELETE RESTRICT,
  tipo VARCHAR(15) NOT NULL CHECK (tipo IN ('peca','servico','mao_de_obra')),
  descricao VARCHAR(200) NOT NULL,
  quantidade NUMERIC(10,2) NOT NULL CHECK (quantidade > 0),
  valor_unitario NUMERIC(12,2) NOT NULL CHECK (valor_unitario >= 0),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_orcamento_itens_ordem ON orcamento_itens(ordem_id);

CREATE TABLE IF NOT EXISTS ordem_eventos (
  id SERIAL PRIMARY KEY,
  ordem_id INTEGER NOT NULL REFERENCES ordens_servico(id) ON DELETE RESTRICT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  acao VARCHAR(40) NOT NULL,
  status_anterior VARCHAR(30),
  status_novo VARCHAR(30) NOT NULL,
  versao_orcamento INTEGER NOT NULL DEFAULT 0,
  registrado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ordem_eventos_ordem ON ordem_eventos(ordem_id, registrado_em);

-- RF14: avaliações vinculadas à ordem de serviço concluída.
-- A autorização de cliente e o status são verificados também no INSERT da API.
CREATE TABLE IF NOT EXISTS avaliacoes (
  id SERIAL PRIMARY KEY,
  ordem_id INTEGER NOT NULL UNIQUE REFERENCES ordens_servico(id) ON DELETE RESTRICT,
  nota SMALLINT NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario VARCHAR(1000) NOT NULL CHECK (LENGTH(BTRIM(comentario)) > 0),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_ordem_id ON avaliacoes(ordem_id);
