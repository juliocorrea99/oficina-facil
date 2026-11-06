-- RF14: avaliações somente de ordens concluídas; uma avaliação por ordem.
-- Estrutura idempotente e sem alterações destrutivas em tabelas anteriores.
CREATE TABLE IF NOT EXISTS avaliacoes (
  id SERIAL PRIMARY KEY,
  ordem_id INTEGER NOT NULL UNIQUE REFERENCES ordens_servico(id) ON DELETE RESTRICT,
  nota SMALLINT NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario VARCHAR(1000) NOT NULL CHECK (LENGTH(BTRIM(comentario)) > 0),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_ordem_id ON avaliacoes(ordem_id);
