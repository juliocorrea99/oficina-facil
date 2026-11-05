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
