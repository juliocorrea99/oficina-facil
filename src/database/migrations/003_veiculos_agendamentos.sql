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
