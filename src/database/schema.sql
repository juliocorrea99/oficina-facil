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
