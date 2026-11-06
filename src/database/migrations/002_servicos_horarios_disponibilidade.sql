-- ==========================================================
-- Migração 002: Serviços, Horários de Funcionamento e Disponibilidade
-- Requisitos atendidos: RF03, RF04, RF05
-- Regras atendidas: RN03 (Disponibilidade da oficina), RN06 (Controle de acesso da oficina)
-- ==========================================================

-- Tabela de serviços oferecidos pelas oficinas (RF03)
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
